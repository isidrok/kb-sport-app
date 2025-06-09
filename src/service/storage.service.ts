import { WorkoutSession, Rep } from "./rep-counting.service";
import { RecordingService } from "./recording.service";
import { WorkoutSettings } from "../shared/types/workout-types";
import { STORAGE_CONFIG } from "../shared/constants/storage-config";

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
  private recordingService = new RecordingService();

  async initialize(): Promise<void> {
    if (!this.isOPFSSupported()) {
      throw new Error("OPFS not supported in this browser");
    }
    this.opfsRoot = await navigator.storage.getDirectory();
  }

  async startRecording(stream: MediaStream): Promise<string> {
    this.ensureInitialized();

    const workoutId = this.generateWorkoutId();

    try {
      const videoWriter = await this.createVideoWriter(workoutId);
      await this.recordingService.startRecording(
        workoutId,
        stream,
        videoWriter
      );
      return workoutId;
    } catch (error) {
      throw new Error(
        `Failed to start recording: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async stopRecording(session: WorkoutSession): Promise<string> {
    if (!this.recordingService.isRecording()) {
      throw new Error("No active recording");
    }

    const { workoutId, videoSize } =
      await this.recordingService.stopRecording();
    const metadata = this.createMetadata(workoutId, session, videoSize);
    await this.saveMetadata(workoutId, metadata, session);

    return workoutId;
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
      if (
        handle.kind === "directory" &&
        name.startsWith(STORAGE_CONFIG.PREFIX)
      ) {
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

  // Settings persistence using localStorage
  saveSettings(settings: WorkoutSettings): void {
    try {
      localStorage.setItem(
        STORAGE_CONFIG.SETTINGS_KEY,
        JSON.stringify(settings)
      );
    } catch (error) {
      console.warn("Failed to save settings:", error);
    }
  }

  loadSettings(): WorkoutSettings | null {
    try {
      const stored = localStorage.getItem(STORAGE_CONFIG.SETTINGS_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn("Failed to load settings:", error);
      return null;
    }
  }

  getDefaultSettings(): WorkoutSettings {
    return {
      countdownDuration: 3,
      sessionDuration: null,
      autoStopOnTimeLimit: false,
      beepInterval: 0,
      beepUnit: "reps",
      announcementInterval: 0,
      announcementUnit: "seconds",
    };
  }

  private isOPFSSupported(): boolean {
    return (
      "navigator" in globalThis &&
      "storage" in navigator &&
      "getDirectory" in navigator.storage
    );
  }

  private isStorageEstimateSupported(): boolean {
    return (
      "navigator" in globalThis &&
      "storage" in navigator &&
      "estimate" in navigator.storage
    );
  }

  private ensureInitialized(): void {
    if (!this.opfsRoot) {
      throw new Error("Storage not initialized");
    }
  }

  private generateWorkoutId(): string {
    return `${STORAGE_CONFIG.PREFIX}${new Date().toISOString()}`;
  }

  private async createVideoWriter(
    workoutId: string
  ): Promise<FileSystemWritableFileStream> {
    const workoutDir = await this.opfsRoot!.getDirectoryHandle(workoutId, {
      create: true,
    });
    const videoFile = await workoutDir.getFileHandle(
      STORAGE_CONFIG.FILE_NAMES.VIDEO,
      { create: true }
    );
    return await videoFile.createWritable();
  }

  private createMetadata(
    workoutId: string,
    session: WorkoutSession,
    videoSize: number
  ): WorkoutMetadata {
    const duration =
      session.reps.length > 0
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

  private async saveMetadata(
    workoutId: string,
    metadata: WorkoutMetadata,
    session: WorkoutSession
  ): Promise<void> {
    const workoutDir = await this.opfsRoot!.getDirectoryHandle(workoutId);
    const metadataFile = await workoutDir.getFileHandle(
      STORAGE_CONFIG.FILE_NAMES.METADATA,
      { create: true }
    );
    const metadataWriter = await metadataFile.createWritable();
    await metadataWriter.write(JSON.stringify({ metadata, session }));
    await metadataWriter.close();
  }

  private async loadMetadata(
    workoutDir: FileSystemDirectoryHandle
  ): Promise<{ metadata: WorkoutMetadata; session: WorkoutSession }> {
    const metadataFile = await workoutDir.getFileHandle(
      STORAGE_CONFIG.FILE_NAMES.METADATA
    );
    const metadataFileHandle = await metadataFile.getFile();
    const metadataText = await metadataFileHandle.text();
    return JSON.parse(metadataText);
  }

  private async loadVideo(
    workoutDir: FileSystemDirectoryHandle
  ): Promise<Blob | undefined> {
    try {
      const videoFile = await workoutDir.getFileHandle(
        STORAGE_CONFIG.FILE_NAMES.VIDEO
      );
      return await videoFile.getFile();
    } catch {
      return undefined; // Video file doesn't exist
    }
  }

  private async tryLoadWorkoutMetadata(
    handle: FileSystemDirectoryHandle
  ): Promise<WorkoutMetadata | null> {
    try {
      const { metadata } = await this.loadMetadata(handle);
      return metadata;
    } catch {
      return null; // Skip invalid workout directories
    }
  }
}
