import { type BeeperAdapter } from "@/infrastructure/adapters/beeper.adapter";

export interface CountdownCallbacks {
  onCountdownTick: (value: number) => void;
  onCountdownComplete: () => void;
}

/**
 * Service responsible for managing countdown timers (start and stop countdowns)
 */
export class CountdownService {
  private countdownInterval: number | null = null;
  private countdownValue: number = 0;

  constructor(private beeperAdapter: BeeperAdapter) {}

  /**
   * Start a countdown from the given duration
   */
  startCountdown(
    durationSeconds: number,
    callbacks: CountdownCallbacks,
    playAudio: boolean
  ): void {
    this.stopCountdown(); // Clear any existing countdown

    this.countdownValue = durationSeconds;

    // Skip countdown if set to 0
    if (this.countdownValue === 0) {
      callbacks.onCountdownComplete();
      return;
    }

    // Initial tick
    callbacks.onCountdownTick(this.countdownValue);

    // Beep immediately if starting at 3 or less
    if (this.countdownValue <= 3 && playAudio) {
      this.beeperAdapter.countdownBeep();
    }

    this.countdownInterval = window.setInterval(() => {
      this.countdownValue--;

      if (this.countdownValue > 0) {
        // Update countdown
        callbacks.onCountdownTick(this.countdownValue);

        // Beep on last 3 seconds
        if (this.countdownValue <= 3 && playAudio) {
          this.beeperAdapter.countdownBeep();
        }
      } else {
        // Countdown complete
        this.stopCountdown();
        callbacks.onCountdownComplete();
      }
    }, 1000);
  }

  /**
   * Stop the current countdown
   */
  stopCountdown(): void {
    if (this.countdownInterval !== null) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  /**
   * Get current countdown value
   */
  getCurrentValue(): number {
    return this.countdownValue;
  }

  /**
   * Check if countdown is active
   */
  isActive(): boolean {
    return this.countdownInterval !== null;
  }
}
