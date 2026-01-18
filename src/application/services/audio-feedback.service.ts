import { type BeeperAdapter } from "@/infrastructure/adapters/beeper.adapter";

export interface AudioFeedbackConfig {
  enabled: boolean;
  repInterval: number | null;
  timeInterval: string | null;
}

/**
 * Service responsible for managing audio feedback during workouts
 */
export class AudioFeedbackService {
  private lastRepBeepCount: number = 0;
  private lastTimeBeep: number = 0;

  constructor(private beeperAdapter: BeeperAdapter) {}

  reset(): void {
    this.lastRepBeepCount = 0;
    this.lastTimeBeep = Date.now();
  }

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
      this.beeperAdapter.timeIntervalBeep();
      this.lastTimeBeep = now;
    }
  }

  playWorkoutStart(enabled: boolean): void {
    if (enabled) {
      this.beeperAdapter.quickBeep();
    }
  }

  playWorkoutStop(enabled: boolean): void {
    if (enabled) {
      this.beeperAdapter.doubleBeep();
    }
  }

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
