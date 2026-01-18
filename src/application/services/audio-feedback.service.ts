import { type BeeperAdapter } from "@/infrastructure/adapters/beeper.adapter";

export interface AudioFeedbackConfig {
  enabled: boolean;
  repInterval: number | null; // Beep every X reps
  timeInterval: string | null; // Beep every "mm:ss"
}

/**
 * Service responsible for managing audio feedback during workouts
 */
export class AudioFeedbackService {
  private lastRepBeepCount: number = 0;
  private lastTimeBeep: number = 0;

  constructor(private beeperAdapter: BeeperAdapter) {}

  /**
   * Reset audio feedback tracking (call when workout starts)
   */
  reset(): void {
    this.lastRepBeepCount = 0;
    this.lastTimeBeep = Date.now();
  }

  /**
   * Check and trigger rep-based audio feedback
   */
  checkRepFeedback(currentRepCount: number, config: AudioFeedbackConfig): void {
    if (!config.enabled || !config.repInterval) {
      return;
    }

    const repsSinceLastBeep = currentRepCount - this.lastRepBeepCount;

    if (repsSinceLastBeep >= config.repInterval) {
      this.beeperAdapter.quickBeep();
      this.lastRepBeepCount = currentRepCount;
    }
  }

  /**
   * Check and trigger time-based audio feedback
   */
  checkTimeFeedback(config: AudioFeedbackConfig): void {
    if (!config.enabled || !config.timeInterval) {
      return;
    }

    const intervalMs = this.parseTimeToMs(config.timeInterval);
    if (!intervalMs) {
      return;
    }

    const now = Date.now();
    const timeSinceLastBeep = now - this.lastTimeBeep;

    if (timeSinceLastBeep >= intervalMs) {
      this.beeperAdapter.quickBeep();
      this.lastTimeBeep = now;
    }
  }

  /**
   * Play workout start sound
   */
  playWorkoutStart(enabled: boolean): void {
    if (enabled) {
      this.beeperAdapter.quickBeep();
    }
  }

  /**
   * Play workout stop sound
   */
  playWorkoutStop(enabled: boolean): void {
    if (enabled) {
      this.beeperAdapter.doubleBeep();
    }
  }

  /**
   * Parse time string (mm:ss) to milliseconds
   */
  private parseTimeToMs(timeString: string): number {
    const parts = timeString.split(":");
    if (parts.length !== 2) {
      return 0;
    }
    const minutes = parseInt(parts[0], 10);
    const seconds = parseInt(parts[1], 10);
    if (isNaN(minutes) || isNaN(seconds)) {
      return 0;
    }
    return (minutes * 60 + seconds) * 1000;
  }
}
