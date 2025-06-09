import { WorkoutSession, Rep } from "./rep-counting.service";
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

/**
 * Pure storage service responsible for OPFS file operations and settings persistence.
 * No longer manages recording - that's handled by RecordingService.
 */
export class StorageService {
  private opfsRoot: FileSystemDirectoryHandle | null = null;

  async initialize(): Promise<void> {
    if (!this.isOPFSSupported()) {
      throw new Error("OPFS not supported in this browser");
    }
    this.opfsRoot = await navigator.storage.getDirectory();
  }

  /**
   * Creates a video file writer for the given workout ID
   * Used by external recording coordination
   */
  async createVideoWriter(
    workoutId: string
  ): Promise<FileSystemWritableFileStream> {
    this.ensureInitialized();

    const workoutDir = await this.opfsRoot!.getDirectoryHandle(workoutId, {
      create: true,
    });
    const videoFile = await workoutDir.getFileHandle(
      STORAGE_CONFIG.FILE_NAMES.VIDEO,
      { create: true }
    );
    return await videoFile.createWritable();
  }

  /**
   * Saves workout metadata and session data
   */
  async saveWorkout(
    workoutId: string,
    session: WorkoutSession,
    videoSize: number
  ): Promise<void> {
    this.ensureInitialized();

    const metadata = this.createMetadata(workoutId, session, videoSize);
    await this.saveMetadata(workoutId, metadata, session);
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


  generateWorkoutId(): string {
    return `${STORAGE_CONFIG.PREFIX}${new Date().toISOString()}`;
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