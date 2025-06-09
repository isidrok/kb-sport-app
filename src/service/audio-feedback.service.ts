import { AudioService } from "./audio.service";
import { WorkoutSession } from "./rep-counting.service";
import { WorkoutSettings } from "../shared/types/workout-types";

/**
 * Pure audio feedback service responsible for audio operations during workouts.
 * No countdown management, no auto-stop logic - just pure audio operations.
 */
export class AudioFeedbackService {
  private audioService = new AudioService();
  private settings: WorkoutSettings;
  private lastBeepValue: number = 0;
  private lastAnnouncementValue: number = 0;
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

  // Pure audio operations
  async playCountdownBeep(): Promise<void> {
    await this.audioService.playCountdownBeep();
  }

  async playStartBeep(): Promise<void> {
    await this.audioService.playStartBeep();
  }

  async playSessionEndBeeps(): Promise<void> {
    await this.audioService.playSessionEndBeeps();
  }

  async playSessionEndFinalBeep(): Promise<void> {
    await this.audioService.playSessionEndFinalBeep();
  }

  startSession(session: WorkoutSession): void {
    this.lastBeepValue =
      this.settings.beepUnit === "reps" ? 0 : session.startTime;
    this.lastAnnouncementValue =
      this.settings.announcementUnit === "reps" ? 0 : session.startTime;

    // Set up time-based beep interval if using seconds
    if (
      this.settings.beepInterval > 0 &&
      this.settings.beepUnit === "seconds"
    ) {
      this.timeBeepIntervalId = window.setInterval(() => {
        this.audioService.playBeep();
      }, this.settings.beepInterval * 1000);
    }
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
          await this.audioService.announceProgress(session.totalReps, session.repsPerMinute);
          this.lastAnnouncementValue = session.totalReps;
        }
      } else {
        // Time-based announcements (seconds)
        const timeSinceLastAnnouncement =
          currentTime - this.lastAnnouncementValue;
        const intervalMs = this.settings.announcementInterval * 1000;

        if (
          timeSinceLastAnnouncement >= intervalMs &&
          session.repsPerMinute > 0
        ) {
          await this.audioService.announceProgress(session.totalReps, session.repsPerMinute);
          this.lastAnnouncementValue = currentTime;
        }
      }
    }
  }

  async endSession(_session: WorkoutSession, isManualStop: boolean = false): Promise<void> {
    // Clear all intervals
    this.clearTimers();

    // Play appropriate beep based on how session ended
    if (isManualStop) {
      // Manual stop: just the final long beep
      await this.audioService.playSessionEndFinalBeep();
    } else {
      // Natural end (time limit): full sequence
      await this.audioService.playSessionEndBeeps();
    }
  }

  stopSession(): void {
    this.clearTimers();
    this.audioService.stopSpeech();
  }

  private clearTimers(): void {
    if (this.timeBeepIntervalId) {
      clearInterval(this.timeBeepIntervalId);
      this.timeBeepIntervalId = null;
    }
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