import { WorkoutSession, Rep } from './rep-counting.service';

const STORAGE_CONFIG = {
  RECORDING: {
    MIME_TYPE: 'video/webm;codecs=vp9',
    CHUNK_INTERVAL_MS: 1000,
  },
  FILE_NAMES: {
    VIDEO: 'recording.webm',
    METADATA: 'metadata.json',
  },
  PREFIX: 'workout_',
} as const;

export interface WorkoutMetadata {
  id: string;
  timestamp: number;
  duration: number;
  totalReps: number;
  avgRepsPerMinute: number;
  videoSize: number;
  reps: Rep[];
}

export interface StoredWorkout {
  metadata: WorkoutMetadata;
  session: WorkoutSession;
  videoBlob?: Blob;
}

interface ActiveRecording {
  workoutId: string;
  mediaRecorder: MediaRecorder;
  videoWriter: FileSystemWritableFileStream;
  videoSize: number;
}

export class StorageService {
  private opfsRoot: FileSystemDirectoryHandle | null = null;
  private activeRecording: ActiveRecording | null = null;

  async initialize(): Promise<void> {
    if (!this.isOPFSSupported()) {
      throw new Error('OPFS not supported in this browser');
    }
    this.opfsRoot = await navigator.storage.getDirectory();
  }

  async startRecording(stream: MediaStream): Promise<string> {
    this.ensureInitialized();

    const workoutId = this.generateWorkoutId();

    try {
      const { videoWriter, mediaRecorder } = await this.setupRecording(workoutId, stream);

      this.activeRecording = {
        workoutId,
        mediaRecorder,
        videoWriter,
        videoSize: 0,
      };

      mediaRecorder.start(STORAGE_CONFIG.RECORDING.CHUNK_INTERVAL_MS);
      return workoutId;
    } catch (error) {
      throw new Error(`Failed to start recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async stopRecording(session: WorkoutSession): Promise<string> {
    if (!this.activeRecording) {
      throw new Error('No active recording');
    }

    const { workoutId, mediaRecorder, videoWriter, videoSize } = this.activeRecording;

    return new Promise((resolve, reject) => {
      mediaRecorder.onstop = async () => {
        try {
          await videoWriter.close();
          const metadata = this.createMetadata(workoutId, session, videoSize);
          await this.saveMetadata(workoutId, metadata, session);

          this.activeRecording = null;
          resolve(workoutId);
        } catch (error) {
          reject(error);
        }
      };

      mediaRecorder.stop();
    });
  }

  async getWorkout(workoutId: string): Promise<StoredWorkout | null> {
    this.ensureInitialized();

    try {
      const workoutDir = await this.opfsRoot!.getDirectoryHandle(workoutId);
      const { metadata, session } = await this.loadMetadata(workoutDir);
      const videoBlob = await this.loadVideo(workoutDir);

      return { metadata, session, videoBlob };
    } catch {
      return null;
    }
  }

  async getAllWorkouts(): Promise<WorkoutMetadata[]> {
    this.ensureInitialized();

    const workouts: WorkoutMetadata[] = [];

    for await (const [name, handle] of this.opfsRoot!.entries()) {
      if (handle.kind === 'directory' && name.startsWith(STORAGE_CONFIG.PREFIX)) {
        const metadata = await this.tryLoadWorkoutMetadata(handle);
        if (metadata) {
          workouts.push(metadata);
        }
      }
    }

    return workouts.sort((a, b) => b.timestamp - a.timestamp);
  }

  async deleteWorkout(workoutId: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      await this.opfsRoot!.removeEntry(workoutId, { recursive: true });
      return true;
    } catch {
      return false;
    }
  }

  async getStorageUsage(): Promise<{ used: number; quota: number }> {
    if (this.isStorageEstimateSupported()) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        quota: estimate.quota || 0,
      };
    }
    return { used: 0, quota: 0 };
  }

  private isOPFSSupported(): boolean {
    return 'navigator' in globalThis &&
      'storage' in navigator &&
      'getDirectory' in navigator.storage;
  }

  private isStorageEstimateSupported(): boolean {
    return 'navigator' in globalThis &&
      'storage' in navigator &&
      'estimate' in navigator.storage;
  }

  private ensureInitialized(): void {
    if (!this.opfsRoot) {
      throw new Error('Storage not initialized');
    }
  }

  private generateWorkoutId(): string {
    return `${STORAGE_CONFIG.PREFIX}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async setupRecording(workoutId: string, stream: MediaStream): Promise<{
    videoWriter: FileSystemWritableFileStream;
    mediaRecorder: MediaRecorder;
  }> {
    const workoutDir = await this.opfsRoot!.getDirectoryHandle(workoutId, { create: true });
    const videoFile = await workoutDir.getFileHandle(STORAGE_CONFIG.FILE_NAMES.VIDEO, { create: true });
    const videoWriter = await videoFile.createWritable();

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: STORAGE_CONFIG.RECORDING.MIME_TYPE
    });

    mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0 && this.activeRecording) {
        this.activeRecording.videoSize += event.data.size;
        await videoWriter.write(event.data);
      }
    };

    return { videoWriter, mediaRecorder };
  }

  private createMetadata(workoutId: string, session: WorkoutSession, videoSize: number): WorkoutMetadata {
    const duration = session.reps.length > 0
      ? session.reps[session.reps.length - 1].timestamp - session.startTime
      : Date.now() - session.startTime;

    return {
      id: workoutId,
      timestamp: session.startTime,
      duration,
      totalReps: session.totalReps,
      avgRepsPerMinute: session.repsPerMinute,
      videoSize,
      reps: session.reps,
    };
  }

  private async saveMetadata(workoutId: string, metadata: WorkoutMetadata, session: WorkoutSession): Promise<void> {
    const workoutDir = await this.opfsRoot!.getDirectoryHandle(workoutId);
    const metadataFile = await workoutDir.getFileHandle(STORAGE_CONFIG.FILE_NAMES.METADATA, { create: true });
    const metadataWriter = await metadataFile.createWritable();
    await metadataWriter.write(JSON.stringify({ metadata, session }));
    await metadataWriter.close();
  }

  private async loadMetadata(workoutDir: FileSystemDirectoryHandle): Promise<{ metadata: WorkoutMetadata; session: WorkoutSession }> {
    const metadataFile = await workoutDir.getFileHandle(STORAGE_CONFIG.FILE_NAMES.METADATA);
    const metadataFileHandle = await metadataFile.getFile();
    const metadataText = await metadataFileHandle.text();
    return JSON.parse(metadataText);
  }

  private async loadVideo(workoutDir: FileSystemDirectoryHandle): Promise<Blob | undefined> {
    try {
      const videoFile = await workoutDir.getFileHandle(STORAGE_CONFIG.FILE_NAMES.VIDEO);
      return await videoFile.getFile();
    } catch {
      return undefined; // Video file doesn't exist
    }
  }

  private async tryLoadWorkoutMetadata(handle: FileSystemDirectoryHandle): Promise<WorkoutMetadata | null> {
    try {
      const { metadata } = await this.loadMetadata(handle);
      return metadata;
    } catch {
      return null; // Skip invalid workout directories
    }
  }
}