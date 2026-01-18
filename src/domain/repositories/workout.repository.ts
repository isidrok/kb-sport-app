import { WorkoutEntity } from "../entities/workout-entity";
import { WorkoutSummary, WorkoutMetadata } from "../types/workout-storage.types";

/**
 * Repository interface for workout persistence operations.
 *
 * This interface defines what persistence operations the domain needs,
 * without specifying how they are implemented. This allows the domain
 * to remain independent of infrastructure concerns.
 *
 * Implementation lives in infrastructure layer.
 */
export interface IWorkoutRepository {
  /**
   * Start recording video for a workout session
   * @param videoFormat - Video format: "webm" or "mp4" (default: "webm")
   * @param videoQuality - Video quality: "low", "medium", "high", "veryhigh" (default: "medium")
   */
  startRecording(
    workoutId: string,
    mediaStream: MediaStream,
    videoFormat?: string,
    videoQuality?: string
  ): Promise<void>;

  /**
   * Stop recording and finalize the video file
   * Returns the video size in bytes
   */
  stopRecording(workoutId: string): Promise<{ sizeInBytes: number }>;

  /**
   * Persist workout data (metadata and stats)
   * @param videoSize - Size of the video file in bytes (from stopRecording)
   */
  saveWorkout(workout: WorkoutEntity, videoSize: number): Promise<void>;

  /**
   * Retrieve all stored workouts
   */
  getWorkouts(): Promise<WorkoutSummary[]>;

  /**
   * Get video blob for a specific workout
   */
  getWorkoutVideo(workoutId: string): Promise<Blob>;

  /**
   * Get full workout metadata including all reps
   */
  getWorkoutMetadata(workoutId: string): Promise<WorkoutMetadata | null>;

  /**
   * Delete a workout and all associated data
   */
  deleteWorkout(workoutId: string): Promise<void>;

  /**
   * Check available storage space
   */
  checkStorageAvailable(): Promise<{ available: boolean; spaceInMB: number }>;
}
