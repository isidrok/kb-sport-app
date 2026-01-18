export interface AutoStopConfig {
  autoStopTime: string | null;
  stopCountdownSeconds: number | null;
}

export interface AutoStopCallbacks {
  onStopCountdownStart: (seconds: number) => void;
}

/**
 * Service responsible for managing auto-stop timer and countdown
 */
export class AutoStopService {
  private autoStopTimer: number | null = null;

  setup(config: AutoStopConfig, callbacks: AutoStopCallbacks): void {
    this.clear();

    const autoStopMs = config.autoStopTime
      ? this.parseTimeToMs(config.autoStopTime)
      : null;

    if (!autoStopMs) {
      return;
    }

    const stopCountdownSeconds = config.stopCountdownSeconds ?? 0;
    const stopCountdownDuration = stopCountdownSeconds * 1000;
    const timeUntilStopCountdown = autoStopMs - stopCountdownDuration;

    if (timeUntilStopCountdown > 0) {
      this.autoStopTimer = window.setTimeout(() => {
        callbacks.onStopCountdownStart(stopCountdownSeconds);
      }, timeUntilStopCountdown);
    }
  }

  clear(): void {
    if (this.autoStopTimer !== null) {
      clearTimeout(this.autoStopTimer);
      this.autoStopTimer = null;
    }
  }

  isActive(): boolean {
    return this.autoStopTimer !== null;
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
