import { WorkoutMetadata } from "@/domain/types/workout-storage.types";

export class OPFSAdapter {
  private rootPromise: Promise<FileSystemDirectoryHandle> | null = null;

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

  async createWorkoutDirectory(workoutId: string): Promise<void> {
    const root = await this.getRoot();
    const appDir = await root.getDirectoryHandle("kb-sport-app", {
      create: true,
    });
    await appDir.getDirectoryHandle(workoutId, { create: true });
  }

  async writeMetadata(
    workoutId: string,
    metadata: WorkoutMetadata,
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

  async readMetadata(workoutId: string): Promise<WorkoutMetadata | null> {
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

  async listWorkouts(): Promise<string[]> {
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

  async deleteWorkout(workoutId: string): Promise<void> {
    const root = await this.getRoot();
    const appDir = await root.getDirectoryHandle("kb-sport-app");
    await appDir.removeEntry(workoutId, { recursive: true });
  }

  async getVideoBlob(workoutId: string): Promise<Blob> {
    const root = await this.getRoot();
    const appDir = await root.getDirectoryHandle("kb-sport-app");
    const workoutDir = await appDir.getDirectoryHandle(workoutId);
    const fileHandle = await workoutDir.getFileHandle("video.webm");
    const file = await fileHandle.getFile();
    return file;
  }

  async getVideoFileWriter(
    workoutId: string,
  ): Promise<FileSystemWritableFileStream> {
    const root = await this.getRoot();
    const appDir = await root.getDirectoryHandle("kb-sport-app");
    const workoutDir = await appDir.getDirectoryHandle(workoutId);
    const fileHandle = await workoutDir.getFileHandle("video.webm", {
      create: true,
    });
    return await fileHandle.createWritable();
  }
}

export const opfsAdapter = new OPFSAdapter();
