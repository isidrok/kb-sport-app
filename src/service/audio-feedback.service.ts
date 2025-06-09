import { AudioService } from "./audio.service";
import { WorkoutSession } from "../shared/types/workout-types";
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

  // Application layer methods - define what sounds to play
  async playCountdownSound(): Promise<void> {
    // Countdown: high-pitched, short beep
    await this.audioService.playBeep(1000, 150, 0.4);
  }

  async playWorkoutStartSound(): Promise<void> {
    // Workout start: lower-pitched, longer beep
    await this.audioService.playBeep(600, 300, 0.5);
  }

  async playSessionEndSequence(): Promise<void> {
    // Session end: 3 countdown beeps + final tone
    await this.audioService.playBeep(1000, 150, 0.4);
    setTimeout(() => this.audioService.playBeep(1000, 150, 0.4), 1000);
    setTimeout(() => this.audioService.playBeep(1000, 150, 0.4), 2000);
    setTimeout(() => this.audioService.playBeep(600, 400, 0.6), 3000);
  }

  async playManualStopSound(): Promise<void> {
    // Manual stop: just final long beep
    await this.audioService.playBeep(600, 400, 0.6);
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
        // Time-based milestone: standard beep
        this.audioService.playBeep(800, 200, 0.6);
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
          // Rep milestone: double beep pattern
          await this.audioService.playBeep(800, 150, 0.5);
          setTimeout(() => this.audioService.playBeep(800, 150, 0.5), 200);
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
          // Rep-based announcement: compose message and speak
          const message = this.composeProgressMessage(session.totalReps, session.repsPerMinute);
          await this.audioService.speak(message, 1.1, 1, 0.7);
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
          // Time-based announcement: compose message and speak
          const message = this.composeProgressMessage(session.totalReps, session.repsPerMinute);
          await this.audioService.speak(message, 1.1, 1, 0.7);
          this.lastAnnouncementValue = currentTime;
        }
      }
    }
  }

  async endSession(_session: WorkoutSession, isManualStop: boolean = false): Promise<void> {
    // Clear all intervals
    this.clearTimers();

    // Play appropriate sound based on how session ended
    if (isManualStop) {
      // Manual stop: just the final long beep
      await this.playManualStopSound();
    } else {
      // Natural end (time limit): full sequence
      await this.playSessionEndSequence();
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

  private composeProgressMessage(totalReps: number, repsPerMinute: number): string {
    const roundedRPM = Math.round(repsPerMinute);
    
    if (totalReps === 1) {
      return `1 rep at ${roundedRPM} RPM`;
    } else {
      return `${totalReps} reps at ${roundedRPM} RPM`;
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