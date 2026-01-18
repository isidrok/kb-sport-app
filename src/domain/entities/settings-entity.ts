import { SettingsData, DEFAULT_SETTINGS } from "../types/settings.types";

/**
 * Core business entity representing application settings.
 *
 * Business rules:
 * - Audio intervals must be in valid "mm:ss" format
 */
export class SettingsEntity {
  private data: SettingsData;

  constructor(data?: Partial<SettingsData>) {
    this.data = { ...DEFAULT_SETTINGS, ...data };
    this.validate();
  }

  // ===== Getters =====

  get startCountdownSeconds(): number {
    return this.data.startCountdownSeconds;
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

  get autoStopWorkoutTime(): string | null {
    return this.data.autoStopWorkoutTime;
  }

  get stopWorkoutCountdown(): number | null {
    return this.data.stopWorkoutCountdown;
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

  // ===== Setters with validation =====

  setStartCountdownSeconds(seconds: number): void {
    this.data.startCountdownSeconds = Math.max(0, seconds);
  }

  setRecordVideo(enabled: boolean): void {
    this.data.recordVideo = enabled;
  }

  setVideoFormat(format: string): void {
    const validFormats = ["webm", "mp4"];
    this.data.videoFormat = validFormats.includes(format) ? format : "webm";
  }

  setVideoQuality(quality: string): void {
    const validQualities = ["low", "medium", "high", "veryhigh"];
    this.data.videoQuality = validQualities.includes(quality)
      ? quality
      : "medium";
  }

  setAutoStopWorkoutTime(time: string | null): void {
    if (time !== null && time !== "" && !this.isValidTimeFormat(time)) {
      throw new Error("Auto-stop time must be in mm:ss format");
    }
    this.data.autoStopWorkoutTime = time && time !== "" ? time : null;
  }

  setStopWorkoutCountdown(seconds: number | null): void {
    this.data.stopWorkoutCountdown =
      seconds !== null && seconds > 0 ? seconds : null;
  }

  setAudioFeedbackEnabled(enabled: boolean): void {
    this.data.audioFeedbackEnabled = enabled;
  }

  setAudioFeedbackRepInterval(reps: number | null): void {
    this.data.audioFeedbackRepInterval = reps && reps > 0 ? reps : null;
  }

  setAudioFeedbackTimeInterval(time: string | null): void {
    if (time !== null && time !== "" && !this.isValidTimeFormat(time)) {
      throw new Error("Audio feedback time interval must be in mm:ss format");
    }
    this.data.audioFeedbackTimeInterval = time && time !== "" ? time : null;
  }

  // ===== Helper methods =====

  /**
   * Parse auto-stop time to milliseconds
   */
  parseAutoStopTimeToMs(): number | null {
    if (!this.data.autoStopWorkoutTime) {
      return null;
    }
    return this.parseTimeToMs(this.data.autoStopWorkoutTime);
  }

  /**
   * Parse audio feedback time interval to milliseconds
   */
  parseAudioFeedbackTimeToMs(): number | null {
    if (!this.data.audioFeedbackTimeInterval) {
      return null;
    }
    return this.parseTimeToMs(this.data.audioFeedbackTimeInterval);
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

  /**
   * Validate time format (mm:ss)
   */
  private isValidTimeFormat(time: string): boolean {
    const regex = /^([0-5]?[0-9]):([0-5][0-9])$/;
    return regex.test(time);
  }

  /**
   * Validate all settings
   */
  private validate(): void {
    // Ensure non-negative countdown
    if (this.data.startCountdownSeconds < 0) {
      this.data.startCountdownSeconds = DEFAULT_SETTINGS.startCountdownSeconds;
    }

    if (
      this.data.stopWorkoutCountdown !== null &&
      this.data.stopWorkoutCountdown < 0
    ) {
      this.data.stopWorkoutCountdown = DEFAULT_SETTINGS.stopWorkoutCountdown;
    }

    // Validate auto-stop time format
    if (
      this.data.autoStopWorkoutTime !== null &&
      !this.isValidTimeFormat(this.data.autoStopWorkoutTime)
    ) {
      this.data.autoStopWorkoutTime = null;
    }

    // Validate time interval format
    if (
      this.data.audioFeedbackTimeInterval !== null &&
      !this.isValidTimeFormat(this.data.audioFeedbackTimeInterval)
    ) {
      this.data.audioFeedbackTimeInterval = null;
    }

    // Ensure rep interval is positive if set
    if (
      this.data.audioFeedbackRepInterval !== null &&
      this.data.audioFeedbackRepInterval <= 0
    ) {
      this.data.audioFeedbackRepInterval = null;
    }

    // Validate video settings
    const validFormats = ["webm", "mp4"];
    if (!validFormats.includes(this.data.videoFormat)) {
      this.data.videoFormat = DEFAULT_SETTINGS.videoFormat;
    }

    const validQualities = ["low", "medium", "high", "veryhigh"];
    if (!validQualities.includes(this.data.videoQuality)) {
      this.data.videoQuality = DEFAULT_SETTINGS.videoQuality;
    }
  }

  /**
   * Get all settings data for serialization
   */
  toData(): SettingsData {
    return { ...this.data };
  }

  /**
   * Reset to default settings
   */
  reset(): void {
    this.data = { ...DEFAULT_SETTINGS };
  }
}
