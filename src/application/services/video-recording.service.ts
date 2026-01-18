import { type WorkoutStorageAdapter } from "@/infrastructure/adapters/workout-storage.adapter";

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

  constructor(private workoutStorageAdapter: WorkoutStorageAdapter) {}

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
