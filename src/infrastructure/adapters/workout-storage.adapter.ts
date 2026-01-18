import { IWorkoutRepository } from "@/domain/repositories/workout.repository";
import { WorkoutEntity } from "@/domain/entities/workout-entity";
import {
  WorkoutSummary,
  WorkoutMetadata,
} from "@/domain/types/workout-storage.types";

/**
 * State for an active video recording
 */
interface RecordingState {
  mediaRecorder: MediaRecorder;
  fileWriter: FileSystemWritableFileStream;
  totalSize: number;
}

/**
 * Workout storage adapter using OPFS (Origin Private File System) and MediaRecorder.
 *
 * Implements the repository interface defined by the domain,
 * handling all persistence concerns including:
 * - Video recording via MediaRecorder API
 * - File system operations via OPFS
 * - Metadata serialization
 */
export class WorkoutStorageAdapter implements IWorkoutRepository {
  private rootPromise: Promise<FileSystemDirectoryHandle> | null = null;
  private activeRecordings: Map<string, RecordingState> = new Map();

  // ===== OPFS Operations =====

  private async getRoot(): Promise<FileSystemDirectoryHandle> {
    if (!this.rootPromise) {
      this.rootPromise = navigator.storage.getDirectory();
    }
    return this.rootPromise;
  }

  async checkStorageAvailable(): Promise<{
    available: boolean;
    spaceInMB: number;
  }> {
    try {
      if (!("storage" in navigator) || !("getDirectory" in navigator.storage)) {
        return { available: false, spaceInMB: 0 };
      }

      const estimate = await navigator.storage.estimate();
      const availableBytes = (estimate.quota || 0) - (estimate.usage || 0);
      const spaceInMB = Math.floor(availableBytes / (1024 * 1024));

      return { available: true, spaceInMB };
    } catch {
      return { available: false, spaceInMB: 0 };
    }
  }

  private async createWorkoutDirectory(workoutId: string): Promise<void> {
    const root = await this.getRoot();
    const appDir = await root.getDirectoryHandle("kb-sport-app", {
      create: true,
    });
    await appDir.getDirectoryHandle(workoutId, { create: true });
  }

  private async writeMetadata(
    workoutId: string,
    metadata: WorkoutMetadata
  ): Promise<void> {
    const root = await this.getRoot();
    const appDir = await root.getDirectoryHandle("kb-sport-app");
    const workoutDir = await appDir.getDirectoryHandle(workoutId);
    const fileHandle = await workoutDir.getFileHandle("metadata.json", {
      create: true,
    });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(metadata, null, 2));
    await writable.close();
  }

  private async readMetadata(
    workoutId: string
  ): Promise<WorkoutMetadata | null> {
    try {
      const root = await this.getRoot();
      const appDir = await root.getDirectoryHandle("kb-sport-app");
      const workoutDir = await appDir.getDirectoryHandle(workoutId);
      const fileHandle = await workoutDir.getFileHandle("metadata.json");
      const file = await fileHandle.getFile();
      const text = await file.text();
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  private async listWorkoutIds(): Promise<string[]> {
    try {
      const root = await this.getRoot();
      const appDir = await root.getDirectoryHandle("kb-sport-app");
      const workouts: string[] = [];

      for await (const [name, entry] of appDir.entries()) {
        if (entry.kind === "directory" && name.startsWith("workout_")) {
          workouts.push(name);
        }
      }

      return workouts;
    } catch {
      return [];
    }
  }

  private async getVideoFileWriter(
    workoutId: string
  ): Promise<FileSystemWritableFileStream> {
    const root = await this.getRoot();
    const appDir = await root.getDirectoryHandle("kb-sport-app");
    const workoutDir = await appDir.getDirectoryHandle(workoutId);
    const fileHandle = await workoutDir.getFileHandle("video.webm", {
      create: true,
    });
    return await fileHandle.createWritable();
  }

  // ===== Video Recording =====

  async startRecording(
    workoutId: string,
    mediaStream: MediaStream
  ): Promise<void> {
    if (this.activeRecordings.has(workoutId)) {
      throw new Error(`Recording already active for workout: ${workoutId}`);
    }

    // Create workout directory and get file writer
    await this.createWorkoutDirectory(workoutId);
    const fileWriter = await this.getVideoFileWriter(workoutId);

    // Setup MediaRecorder
    const mediaRecorder = new MediaRecorder(mediaStream, {
      mimeType: "video/webm;codecs=vp8",
      videoBitsPerSecond: 2500000,
    });

    // Track recording state for this workout
    const recordingState: RecordingState = {
      mediaRecorder,
      fileWriter,
      totalSize: 0,
    };

    mediaRecorder.ondataavailable = async (event) => {
      if (event.data && event.data.size > 0) {
        await recordingState.fileWriter.write(event.data);
        recordingState.totalSize += event.data.size;
      }
    };

    this.activeRecordings.set(workoutId, recordingState);
    mediaRecorder.start();
  }

  async stopRecording(workoutId: string): Promise<{ sizeInBytes: number }> {
    const recordingState = this.activeRecordings.get(workoutId);

    if (!recordingState) {
      throw new Error(
        `No active recording found for workout: ${workoutId}. Call startRecording first.`
      );
    }

    return new Promise((resolve) => {
      recordingState.mediaRecorder.onstop = async () => {
        await recordingState.fileWriter.close();
        this.activeRecordings.delete(workoutId);
        resolve({ sizeInBytes: recordingState.totalSize });
      };
      recordingState.mediaRecorder.stop();
    });
  }

  // ===== Repository Operations =====

  async saveWorkout(workout: WorkoutEntity, videoSize: number): Promise<void> {
    const stats = workout.getStats();

    if (!stats.startTime || !stats.endTime) {
      throw new Error("Workout must have start and end times to save metadata");
    }

    const metadata: WorkoutMetadata = {
      workoutId: workout.id,
      startTime: stats.startTime.toISOString(),
      endTime: stats.endTime.toISOString(),
      duration: stats.elapsedTime,
      totalReps: stats.repCount,
      rpm: stats.averageRPM,
      reps: stats.reps.map((rep) => ({
        timestamp: rep.timestamp.getTime(),
        hand: rep.hand,
      })),
      videoSize,
    };

    await this.writeMetadata(workout.id, metadata);
  }

  async getWorkouts(): Promise<WorkoutSummary[]> {
    const workoutIds = await this.listWorkoutIds();

    const workouts: WorkoutSummary[] = [];
    for (const workoutId of workoutIds) {
      const metadata = await this.readMetadata(workoutId);

      if (metadata) {
        const summary: WorkoutSummary = {
          workoutId: metadata.workoutId,
          startTime: new Date(metadata.startTime),
          endTime: new Date(metadata.endTime),
          duration: metadata.duration,
          totalReps: metadata.totalReps,
          rpm: metadata.rpm,
          videoSizeInMB:
            Math.round((metadata.videoSize / (1024 * 1024)) * 10) / 10,
        };

        workouts.push(summary);
      }
    }

    // Sort by start time descending (newest first)
    return workouts.sort(
      (a, b) => b.startTime.getTime() - a.startTime.getTime()
    );
  }

  async getWorkoutVideo(workoutId: string): Promise<Blob> {
    const root = await this.getRoot();
    const appDir = await root.getDirectoryHandle("kb-sport-app");
    const workoutDir = await appDir.getDirectoryHandle(workoutId);
    const fileHandle = await workoutDir.getFileHandle("video.webm");
    const file = await fileHandle.getFile();
    return file;
  }

  async deleteWorkout(workoutId: string): Promise<void> {
    const root = await this.getRoot();
    const appDir = await root.getDirectoryHandle("kb-sport-app");
    await appDir.removeEntry(workoutId, { recursive: true });
  }
}

// Export singleton instance
export const workoutStorageAdapter = new WorkoutStorageAdapter();
