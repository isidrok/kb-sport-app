import { workoutStorageAdapter, type WorkoutStorageAdapter } from "@/infrastructure/adapters/workout-storage.adapter";

export interface StorageStatusData {
  isOPFSSupported: boolean;
  hasEnoughSpace: boolean;
  spaceInMB: number;
}

const MINIMUM_STORAGE_MB = 200; // ~10 minutes of medium quality video

/**
 * Service responsible for checking storage availability for video recording
 */
export class StorageCheckService {
  private cachedStatus: StorageStatusData | null = null;

  constructor(private workoutStorage: WorkoutStorageAdapter) {}

  /**
   * Check storage availability and cache the result
   */
  async checkStorage(): Promise<StorageStatusData> {
    const { available, spaceInMB } = await this.workoutStorage.checkStorageAvailable();

    this.cachedStatus = {
      isOPFSSupported: available,
      hasEnoughSpace: spaceInMB >= MINIMUM_STORAGE_MB,
      spaceInMB,
    };

    return this.cachedStatus;
  }

  /**
   * Get cached storage status (synchronous)
   */
  getStorageStatus(): StorageStatusData | null {
    return this.cachedStatus;
  }
}

// Export singleton instance
export const storageCheckService = new StorageCheckService(workoutStorageAdapter);
