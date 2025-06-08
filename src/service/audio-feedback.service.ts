import { AudioService } from "./audio.service";
import { WorkoutSession } from "./rep-counting.service";
import { WorkoutSettings } from "../ui/WorkoutSettings";

export class AudioFeedbackService {
  private audioService = new AudioService();
  private settings: WorkoutSettings;
  private lastBeepValue: number = 0;
  private lastAnnouncementValue: number = 0;
  private sessionTimeoutId: number | null = null;
  private timeBeepIntervalId: number | null = null;

  constructor(settings: WorkoutSettings) {
    this.settings = settings;
  }

  async initialize(): Promise<void> {
    await this.audioService.initialize();
  }

  updateSettings(settings: WorkoutSettings): void {
    this.settings = settings;
  }

  async playCountdownBeep(): Promise<void> {
    await this.audioService.playCountdownBeep();
  }

  async playStartBeep(): Promise<void> {
    await this.audioService.playStartBeep();
  }

  startSession(session: WorkoutSession): void {
    this.lastBeepValue =
      this.settings.beepUnit === "reps" ? 0 : session.startTime;
    this.lastAnnouncementValue =
      this.settings.announcementUnit === "reps" ? 0 : session.startTime;

    // Set up session duration timeout if specified
    if (this.settings.sessionDuration) {
      this.sessionTimeoutId = window.setTimeout(() => {
        this.announceSessionTimeLimit();
      }, this.settings.sessionDuration * 1000);
    }

    // Set up time-based beep interval if using seconds
    if (
      this.settings.beepInterval > 0 &&
      this.settings.beepUnit === "seconds"
    ) {
      this.timeBeepIntervalId = window.setInterval(() => {
        this.audioService.playBeep();
      }, this.settings.beepInterval * 1000);
    }

    // Note: Rep-based beeps and announcements are handled in handleSessionUpdate
  }

  async handleSessionUpdate(session: WorkoutSession): Promise<void> {
    const currentTime = Date.now();

    // Handle beeps based on unit type
    if (this.settings.beepInterval > 0) {
      if (this.settings.beepUnit === "reps") {
        // Rep-based beeps
        const repsSinceLastBeep = session.totalReps - this.lastBeepValue;
        if (repsSinceLastBeep >= this.settings.beepInterval) {
          await this.audioService.playMilestoneBeep();
          this.lastBeepValue = session.totalReps;
        }
      }
      // Time-based beeps are handled by setInterval in startSession
    }

    // Handle announcements based on unit type
    if (this.settings.announcementInterval > 0) {
      if (this.settings.announcementUnit === "reps") {
        // Rep-based announcements
        const repsSinceLastAnnouncement =
          session.totalReps - this.lastAnnouncementValue;
        if (repsSinceLastAnnouncement >= this.settings.announcementInterval) {
          await this.audioService.announceReps(session.totalReps);
          this.lastAnnouncementValue = session.totalReps;
        }
      } else {
        // Time-based announcements (minutes)
        const timeSinceLastAnnouncement =
          currentTime - this.lastAnnouncementValue;
        const intervalMs = this.settings.announcementInterval * 60 * 1000;

        if (
          timeSinceLastAnnouncement >= intervalMs &&
          session.repsPerMinute > 0
        ) {
          await this.audioService.announcePace(session.repsPerMinute);
          this.lastAnnouncementValue = currentTime;
        }
      }
    }
  }

  async endSession(session: WorkoutSession): Promise<void> {
    // Clear all intervals and timeouts
    this.clearTimers();

    // Announce session summary
    await this.audioService.announceSessionEnd(
      session.totalReps,
      session.repsPerMinute
    );
  }

  stopSession(): void {
    this.clearTimers();
    this.audioService.stopSpeech();
  }

  private clearTimers(): void {
    if (this.sessionTimeoutId) {
      clearTimeout(this.sessionTimeoutId);
      this.sessionTimeoutId = null;
    }

    if (this.timeBeepIntervalId) {
      clearInterval(this.timeBeepIntervalId);
      this.timeBeepIntervalId = null;
    }
  }

  private async announceSessionTimeLimit(): Promise<void> {
    await this.audioService.speak("Time limit reached", 1.2, 1, 0.8);
  }

  isAudioAvailable(): boolean {
    return this.audioService.isAudioAvailable();
  }

  isSpeechAvailable(): boolean {
    return this.audioService.isSpeechAvailable();
  }

  dispose(): void {
    this.clearTimers();
    this.audioService.dispose();
  }
}
