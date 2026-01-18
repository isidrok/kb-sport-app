import { SettingsData, DEFAULT_SETTINGS } from "../types/settings.types";

/**
 * Settings entity with simple validation
 */
export class SettingsEntity {
  private data: SettingsData;

  constructor(data?: Partial<SettingsData>) {
    this.data = { ...DEFAULT_SETTINGS, ...data };
    this.normalize();
  }

  // Getters
  get startCountdownSeconds(): number {
    return this.data.startCountdownSeconds;
  }
  get autoStopWorkoutTime(): string | null {
    return this.data.autoStopWorkoutTime;
  }
  get stopWorkoutCountdown(): number | null {
    return this.data.stopWorkoutCountdown;
  }
  get fps(): number {
    return this.data.fps;
  }
  get recordVideo(): boolean {
    return this.data.recordVideo;
  }
  get videoFormat(): string {
    return this.data.videoFormat;
  }
  get videoQuality(): string {
    return this.data.videoQuality;
  }
  get audioFeedbackEnabled(): boolean {
    return this.data.audioFeedbackEnabled;
  }
  get audioFeedbackRepInterval(): number | null {
    return this.data.audioFeedbackRepInterval;
  }
  get audioFeedbackTimeInterval(): string | null {
    return this.data.audioFeedbackTimeInterval;
  }

  /**
   * Normalize values to valid ranges/formats
   */
  private normalize(): void {
    // Clamp FPS between 1 and 60
    this.data.fps = Math.max(1, Math.min(60, Math.floor(this.data.fps)));

    // Ensure countdown is non-negative
    this.data.startCountdownSeconds = Math.max(
      0,
      Math.floor(this.data.startCountdownSeconds)
    );

    // Ensure stop countdown is non-negative if set
    if (this.data.stopWorkoutCountdown !== null) {
      this.data.stopWorkoutCountdown = Math.max(
        0,
        Math.floor(this.data.stopWorkoutCountdown)
      );
    }

    // Ensure rep interval is positive if set
    if (
      this.data.audioFeedbackRepInterval !== null &&
      this.data.audioFeedbackRepInterval <= 0
    ) {
      this.data.audioFeedbackRepInterval = null;
    }

    // Validate formats
    const validFormats = ["webm", "mp4"];
    if (!validFormats.includes(this.data.videoFormat)) {
      this.data.videoFormat = "webm";
    }

    const validQualities = ["low", "medium", "high", "veryhigh"];
    if (!validQualities.includes(this.data.videoQuality)) {
      this.data.videoQuality = "medium";
    }
  }

  toData(): SettingsData {
    return { ...this.data };
  }

  reset(): void {
    this.data = { ...DEFAULT_SETTINGS };
  }
}
