import { type WorkoutStorageAdapter } from "@/infrastructure/adapters/workout-storage.adapter";
import { type StorageCheckService } from "./storage-check.service";

export interface VideoRecordingConfig {
  enabled: boolean;
  format: string;
  quality: string;
}

/**
 * Service responsible for managing video recording during workouts
 */
export class VideoRecordingService {
  private isRecording: boolean = false;

  constructor(
    private workoutStorageAdapter: WorkoutStorageAdapter,
    private storageCheckService: StorageCheckService
  ) {}

  /**
   * Start video recording
   */
  async startRecording(
    workoutId: string,
    mediaStream: MediaStream,
    config: VideoRecordingConfig
  ): Promise<boolean> {
    if (!config.enabled) {
      return false;
    }

    // Check storage availability
    const storage = this.storageCheckService.getStorageStatus();
    if (!storage || !storage.isOPFSSupported) {
      console.info("Skipping video recording: OPFS not supported");
      return false;
    }
    if (!storage.hasEnoughSpace) {
      console.info(`Skipping video recording: insufficient storage (${storage.spaceInMB} MB available, 200 MB needed)`);
      return false;
    }

    try {
      await this.workoutStorageAdapter.startRecording(
        workoutId,
        mediaStream,
        config.format,
        config.quality
      );
      this.isRecording = true;
      return true;
    } catch (error) {
      console.warn("Failed to start video recording:", error);
      this.isRecording = false;
      return false;
    }
  }

  /**
   * Stop video recording and return video size
   */
  async stopRecording(workoutId: string): Promise<number> {
    if (!this.isRecording) {
      return 0;
    }

    try {
      const { sizeInBytes } = await this.workoutStorageAdapter.stopRecording(workoutId);
      this.isRecording = false;
      return sizeInBytes;
    } catch (error) {
      console.error("Failed to stop video recording:", error);
      this.isRecording = false;
      return 0;
    }
  }

  /**
   * Check if currently recording
   */
  isActive(): boolean {
    return this.isRecording;
  }

  /**
   * Reset recording state
   */
  reset(): void {
    this.isRecording = false;
  }
}
