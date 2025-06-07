import { WorkoutSession, Rep } from './workout.service';

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

export class StorageService {
  private opfsRoot: FileSystemDirectoryHandle | null = null;
  private activeRecording: {
    workoutId: string;
    mediaRecorder: MediaRecorder;
    videoWriter: FileSystemWritableFileStream;
    videoSize: number;
  } | null = null;

  async initialize(): Promise<void> {
    if ('navigator' in globalThis && 'storage' in navigator && 'getDirectory' in navigator.storage) {
      this.opfsRoot = await navigator.storage.getDirectory();
    } else {
      throw new Error('OPFS not supported in this browser');
    }
  }

  async startRecording(stream: MediaStream): Promise<string> {
    if (!this.opfsRoot) {
      throw new Error('Storage not initialized');
    }

    const workoutId = `workout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const workoutDir = await this.opfsRoot.getDirectoryHandle(workoutId, { create: true });
    const videoFile = await workoutDir.getFileHandle('recording.webm', { create: true });
    const videoWriter = await videoFile.createWritable();

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9'
    });

    let videoSize = 0;

    mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0) {
        videoSize += event.data.size;
        await videoWriter.write(event.data);
      }
    };

    this.activeRecording = {
      workoutId,
      mediaRecorder,
      videoWriter,
      videoSize,
    };

    mediaRecorder.start(1000); // Record in 1-second chunks
    return workoutId;
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

          const totalVideoSize = videoSize;
          const duration = session.reps.length > 0 
            ? session.reps[session.reps.length - 1].timestamp - session.startTime
            : Date.now() - session.startTime;

          const metadata: WorkoutMetadata = {
            id: workoutId,
            timestamp: session.startTime,
            duration,
            totalReps: session.totalReps,
            avgRepsPerMinute: session.repsPerMinute,
            videoSize: totalVideoSize,
            reps: session.reps,
          };

          const workoutDir = await this.opfsRoot!.getDirectoryHandle(workoutId);
          const metadataFile = await workoutDir.getFileHandle('metadata.json', { create: true });
          const metadataWriter = await metadataFile.createWritable();
          await metadataWriter.write(JSON.stringify({ metadata, session }));
          await metadataWriter.close();

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
    if (!this.opfsRoot) {
      throw new Error('Storage not initialized');
    }

    try {
      const workoutDir = await this.opfsRoot.getDirectoryHandle(workoutId);
      
      const metadataFile = await workoutDir.getFileHandle('metadata.json');
      const metadataFileHandle = await metadataFile.getFile();
      const metadataText = await metadataFileHandle.text();
      const { metadata, session } = JSON.parse(metadataText);

      let videoBlob: Blob | undefined;
      try {
        const videoFile = await workoutDir.getFileHandle('recording.webm');
        const videoFileHandle = await videoFile.getFile();
        videoBlob = videoFileHandle;
      } catch {
        // Video file doesn't exist
      }

      return { metadata, session, videoBlob };
    } catch {
      return null;
    }
  }

  async getAllWorkouts(): Promise<WorkoutMetadata[]> {
    if (!this.opfsRoot) {
      throw new Error('Storage not initialized');
    }

    const workouts: WorkoutMetadata[] = [];
    
    for await (const [name, handle] of this.opfsRoot.entries()) {
      if (handle.kind === 'directory' && name.startsWith('workout_')) {
        try {
          const metadataFile = await handle.getFileHandle('metadata.json');
          const metadataFileHandle = await metadataFile.getFile();
          const metadataText = await metadataFileHandle.text();
          const { metadata } = JSON.parse(metadataText);
          workouts.push(metadata);
        } catch {
          // Skip invalid workout directories
        }
      }
    }

    return workouts.sort((a, b) => b.timestamp - a.timestamp);
  }

  async deleteWorkout(workoutId: string): Promise<boolean> {
    if (!this.opfsRoot) {
      throw new Error('Storage not initialized');
    }

    try {
      await this.opfsRoot.removeEntry(workoutId, { recursive: true });
      return true;
    } catch {
      return false;
    }
  }

  async getStorageUsage(): Promise<{ used: number; quota: number }> {
    if ('navigator' in globalThis && 'storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        quota: estimate.quota || 0,
      };
    }
    return { used: 0, quota: 0 };
  }
}