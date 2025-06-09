import { AudioService } from "./audio.service";
import { WorkoutSession } from "./rep-counting.service";
import { WorkoutSettings } from "../shared/types/workout-types";

export class AudioFeedbackService {
  private audioService = new AudioService();
  private settings: WorkoutSettings;
  private lastBeepValue: number = 0;
  private lastAnnouncementValue: number = 0;
  private sessionTimeoutId: number | null = null;
  private countdownTimeoutId: number | null = null;
  private timeBeepIntervalId: number | null = null;
  private onSessionEndCountdown?: (countdown: number | null) => void;
  private onAutoStop?: () => void;

  constructor(
    settings: WorkoutSettings, 
    onSessionEndCountdown?: (countdown: number | null) => void,
    onAutoStop?: () => void
  ) {
    this.settings = settings;
    this.onSessionEndCountdown = onSessionEndCountdown;
    this.onAutoStop = onAutoStop;
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
      // Calculate remaining time from session start
      const currentTime = Date.now();
      const elapsedTime = currentTime - session.startTime;
      const remainingTime = Math.max(0, (this.settings.sessionDuration * 1000) - elapsedTime);
      
      // Set up countdown warning 3 seconds before end
      if (remainingTime > 3000) {
        this.countdownTimeoutId = window.setTimeout(() => {
          this.startSessionEndCountdown();
        }, remainingTime - 3000);
      } else if (remainingTime > 0) {
        // Less than 3 seconds left, start countdown immediately
        this.startSessionEndCountdown();
      }
      
      // Set up final timeout
      this.sessionTimeoutId = window.setTimeout(() => {
        this.announceSessionTimeLimit();
      }, remainingTime);
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

    // Debug logging
    console.log("Audio feedback session update:", {
      totalReps: session.totalReps,
      beepInterval: this.settings.beepInterval,
      beepUnit: this.settings.beepUnit,
      announcementInterval: this.settings.announcementInterval,
      announcementUnit: this.settings.announcementUnit,
      lastBeepValue: this.lastBeepValue,
      lastAnnouncementValue: this.lastAnnouncementValue
    });

    // Handle beeps based on unit type
    if (this.settings.beepInterval > 0) {
      if (this.settings.beepUnit === "reps") {
        // Rep-based beeps
        const repsSinceLastBeep = session.totalReps - this.lastBeepValue;
        console.log("Rep beep check:", { repsSinceLastBeep, beepInterval: this.settings.beepInterval });
        if (repsSinceLastBeep >= this.settings.beepInterval) {
          console.log("Playing milestone beep!");
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
        console.log("Rep announcement check:", { repsSinceLastAnnouncement, announcementInterval: this.settings.announcementInterval });
        if (repsSinceLastAnnouncement >= this.settings.announcementInterval) {
          console.log("Playing rep announcement!");
          await this.audioService.announceProgress(session.totalReps, session.repsPerMinute);
          this.lastAnnouncementValue = session.totalReps;
        }
      } else {
        // Time-based announcements (seconds)
        const timeSinceLastAnnouncement =
          currentTime - this.lastAnnouncementValue;
        const intervalMs = this.settings.announcementInterval * 1000;

        console.log("Time announcement check:", { 
          timeSinceLastAnnouncement, 
          intervalMs, 
          repsPerMinute: session.repsPerMinute 
        });

        if (
          timeSinceLastAnnouncement >= intervalMs &&
          session.repsPerMinute > 0
        ) {
          console.log("Playing pace announcement!");
          await this.audioService.announceProgress(session.totalReps, session.repsPerMinute);
          this.lastAnnouncementValue = currentTime;
        }
      }
    }
  }

  async endSession(_session: WorkoutSession, isManualStop: boolean = false): Promise<void> {
    // Clear all intervals and timeouts
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
    if (this.sessionTimeoutId) {
      clearTimeout(this.sessionTimeoutId);
      this.sessionTimeoutId = null;
    }

    if (this.countdownTimeoutId) {
      clearTimeout(this.countdownTimeoutId);
      this.countdownTimeoutId = null;
    }

    if (this.timeBeepIntervalId) {
      clearInterval(this.timeBeepIntervalId);
      this.timeBeepIntervalId = null;
    }
  }

  private startSessionEndCountdown(): void {
    if (!this.onSessionEndCountdown) return;
    
    let count = 3;
    this.onSessionEndCountdown(count);
    
    // Play first countdown beep
    this.audioService.playCountdownBeep();
    
    const countdownInterval = setInterval(async () => {
      count--;
      if (count > 0) {
        this.onSessionEndCountdown!(count);
        await this.audioService.playCountdownBeep();
      } else {
        this.onSessionEndCountdown!(null);
        clearInterval(countdownInterval);
        // Final beep is handled by announceSessionTimeLimit
      }
    }, 1000);
  }

  private async announceSessionTimeLimit(): Promise<void> {
    // Clear countdown UI
    if (this.onSessionEndCountdown) {
      this.onSessionEndCountdown(null);
    }
    
    // Auto-stop if enabled
    if (this.settings.autoStopOnTimeLimit && this.onAutoStop) {
      this.onAutoStop();
    } else {
      // Play final different beep for time limit reached
      await this.audioService.playSessionEndFinalBeep();
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
