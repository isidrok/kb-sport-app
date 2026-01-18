export interface AutoStopConfig {
  autoStopTime: string | null; // "mm:ss" format
  stopCountdownSeconds: number | null; // Countdown before stopping
}

export interface AutoStopCallbacks {
  onStopCountdownStart: (seconds: number) => void;
}

/**
 * Service responsible for managing auto-stop timer and countdown
 */
export class AutoStopService {
  private autoStopTimer: number | null = null;

  /**
   * Setup auto-stop timer based on config
   */
  setup(config: AutoStopConfig, callbacks: AutoStopCallbacks): void {
    this.clear(); // Clear any existing timer

    const autoStopMs = config.autoStopTime
      ? this.parseTimeToMs(config.autoStopTime)
      : null;

    if (!autoStopMs) {
      return;
    }

    // Calculate when to start the stop countdown
    // We display the countdown immediately, so we need to subtract (countdown * 1000)
    // For example: if auto-stop is 15s and countdown is 5s, we start at 10s
    // At 10s: display "5", at 11s: display "4", ..., at 15s: stop
    // If countdown is null, just stop immediately at the auto-stop time
    const stopCountdownSeconds = config.stopCountdownSeconds ?? 0;
    const stopCountdownDuration = stopCountdownSeconds * 1000;
    const timeUntilStopCountdown = autoStopMs - stopCountdownDuration;

    if (timeUntilStopCountdown > 0) {
      this.autoStopTimer = window.setTimeout(() => {
        callbacks.onStopCountdownStart(stopCountdownSeconds);
      }, timeUntilStopCountdown);
    }
  }

  /**
   * Clear auto-stop timer
   */
  clear(): void {
    if (this.autoStopTimer !== null) {
      clearTimeout(this.autoStopTimer);
      this.autoStopTimer = null;
    }
  }

  /**
   * Check if auto-stop is active
   */
  isActive(): boolean {
    return this.autoStopTimer !== null;
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
