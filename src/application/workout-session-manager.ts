import {
  SessionState,
  SessionStateChangedEvent,
} from "@/domain/events/session-events";
import { WorkoutUpdatedEvent } from "@/domain/events/workout-events";
import { CameraAccessEvent } from "@/application/events/camera-access-event";
import { WorkoutEntity } from "@/domain/entities/workout-entity";
import {
  repDetectionService,
  type RepDetectionService,
} from "@/domain/services/rep-detection.service";
import {
  cameraAdapter,
  type CameraAdapter,
} from "@/infrastructure/adapters/camera.adapter";
import {
  predictionAdapter,
  type PredictionAdapter,
} from "@/infrastructure/adapters/prediction.adapter";
import {
  predictionRendererAdapter,
  type PredictionRendererAdapter,
} from "@/infrastructure/adapters/prediction-renderer.adapter";
import { type IWorkoutRepository } from "@/domain/repositories/workout.repository";
import { workoutStorageAdapter } from "@/infrastructure/adapters/workout-storage.adapter";
import { eventBus, type EventBus } from "@/infrastructure/event-bus/event-bus";
import { type Prediction } from "@/domain/types/rep-detection.types";
import {
  settingsStorageAdapter,
  type SettingsStorageAdapter,
} from "@/infrastructure/adapters/settings-storage.adapter";
import {
  beeperAdapter,
  type BeeperAdapter,
} from "@/infrastructure/adapters/beeper.adapter";

interface WorkoutSessionManagerDependencies {
  cameraAdapter: CameraAdapter;
  predictionAdapter: PredictionAdapter;
  rendererAdapter: PredictionRendererAdapter;
  repDetectionService: RepDetectionService;
  workoutRepo: IWorkoutRepository;
  eventBus: EventBus;
  settingsAdapter: SettingsStorageAdapter;
  beeperAdapter: BeeperAdapter;
}

/**
 * Central coordinator for the workout session lifecycle.
 *
 * Manages the state machine:
 * Idle → PoseDetecting → StartCountdown → Running → Finished → Idle
 *
 * Responsibilities:
 * - State transitions and validation
 * - Camera and pose detection coordination
 * - Rep detection during Running state
 * - Countdown logic
 * - Video recording lifecycle
 * - Event emission for UI updates
 */
export class WorkoutSessionManager {
  private state: SessionState = SessionState.Idle;
  private currentWorkout: WorkoutEntity | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private frameProcessingRAF: number | null = null;
  private lastFrameTime: number = 0;
  private targetFrameInterval: number = 1000 / 12;
  private countdownInterval: number | null = null;
  private timerInterval: number | null = null;
  private countdownValue: number = 0;
  private autoStopTimer: number | null = null;
  private stopCountdownInterval: number | null = null;
  private isVideoRecording: boolean = false;
  private lastRepBeepCount: number = 0;
  private lastTimeBeep: number = 0;

  constructor(private dependencies: WorkoutSessionManagerDependencies) {}

  /**
   * Start camera and frame processing
   * Helper method used by both preview and direct workout start
   */
  private async startCamera(
    videoElement: HTMLVideoElement,
    canvasElement: HTMLCanvasElement
  ): Promise<void> {
    this.videoElement = videoElement;
    this.canvasElement = canvasElement;

    // Setup video and canvas dimensions
    const videoRect = videoElement.getBoundingClientRect();
    const canvasRect = canvasElement.getBoundingClientRect();

    videoElement.width = videoRect.width;
    videoElement.height = videoRect.height;
    canvasElement.width = canvasRect.width;
    canvasElement.height = canvasRect.height;

    // Start camera
    await this.dependencies.cameraAdapter.start(videoElement);

    // Start frame processing loop
    this.startFrameProcessing();

    // Emit ready event
    this.dependencies.eventBus.publish(
      new CameraAccessEvent({
        status: "ready",
        message: "Camera started successfully",
      })
    );
  }

  /**
   * Start preview mode - camera + pose detection without rep counting
   */
  async startPreview(
    videoElement: HTMLVideoElement,
    canvasElement: HTMLCanvasElement
  ): Promise<void> {
    if (
      this.state !== SessionState.Idle &&
      this.state !== SessionState.Finished
    ) {
      throw new Error(`Cannot start preview from state: ${this.state}`);
    }

    try {
      await this.startCamera(videoElement, canvasElement);

      // Transition to PoseDetecting state
      this.setState(SessionState.PoseDetecting);
    } catch (error) {
      // Cleanup on error
      this.cleanup();

      const errorMessage =
        error instanceof Error ? error.message : "Failed to start camera";
      this.dependencies.eventBus.publish(
        new CameraAccessEvent({
          status: "error",
          message: errorMessage,
        })
      );

      throw error;
    }
  }

  /**
   * Stop preview mode and return to Idle
   */
  stopPreview(): void {
    if (this.state !== SessionState.PoseDetecting) {
      throw new Error(`Cannot stop preview from state: ${this.state}`);
    }

    this.cleanup();
    this.setState(SessionState.Idle);
  }

  /**
   * Start workout - can start from Idle (direct) or PoseDetecting (after preview)
   */
  async startWorkout(
    videoElement?: HTMLVideoElement,
    canvasElement?: HTMLCanvasElement
  ): Promise<void> {
    // Allow starting from Idle or PoseDetecting
    if (
      this.state !== SessionState.Idle &&
      this.state !== SessionState.PoseDetecting &&
      this.state !== SessionState.Finished
    ) {
      throw new Error(`Cannot start workout from state: ${this.state}`);
    }

    try {
      // If starting from Idle or Finished, need to start camera first
      if (
        this.state === SessionState.Idle ||
        this.state === SessionState.Finished
      ) {
        if (!videoElement || !canvasElement) {
          throw new Error(
            "Video and canvas elements required when starting from Idle"
          );
        }
        await this.startCamera(videoElement, canvasElement);
      }

      // Create new workout
      this.currentWorkout = new WorkoutEntity(
        `workout_${new Date().toISOString()}`
      );

      // Start countdown (3, 2, 1)
      this.startCountdown();
    } catch (error) {
      // Cleanup on error
      this.cleanup();

      const errorMessage =
        error instanceof Error ? error.message : "Failed to start workout";
      this.dependencies.eventBus.publish(
        new CameraAccessEvent({
          status: "error",
          message: errorMessage,
        })
      );

      throw error;
    }
  }

  /**
   * Stop workout and save data
   */
  async stopWorkout(): Promise<void> {
    if (
      this.state !== SessionState.Running &&
      this.state !== SessionState.StopCountdown
    ) {
      throw new Error(`Cannot stop workout from state: ${this.state}`);
    }

    if (!this.currentWorkout) {
      throw new Error("No active workout to stop");
    }

    const settings = this.dependencies.settingsAdapter.getSettings();

    // Double beep on workout stop if audio feedback is enabled
    if (settings.audioFeedbackEnabled) {
      this.dependencies.beeperAdapter.doubleBeep();
    }

    // Stop the workout entity
    this.currentWorkout.stop();

    // Stop timer, frame processing, and auto-stop timer
    this.stopTimer();
    this.stopFrameProcessing();
    this.clearAutoStopTimer();

    // Stop camera
    this.dependencies.cameraAdapter.stop();

    // Stop video recording and save if recording was active
    let videoSize = 0;
    if (this.isVideoRecording) {
      try {
        const { sizeInBytes } =
          await this.dependencies.workoutRepo.stopRecording(
            this.currentWorkout.id
          );
        videoSize = sizeInBytes;
      } catch (error) {
        console.error("Failed to stop video recording:", error);
      }
    }

    // Always save workout metadata
    try {
      await this.dependencies.workoutRepo.saveWorkout(
        this.currentWorkout,
        videoSize
      );
    } catch (error) {
      console.error("Failed to save workout:", error);
    }

    // Reset state
    this.isVideoRecording = false;
    this.dependencies.repDetectionService.reset();

    // Clear canvas
    if (this.canvasElement) {
      this.dependencies.rendererAdapter.clear(this.canvasElement);
    }

    // Transition to Finished state
    this.setState(SessionState.Finished);

    // Emit final stats
    this.emitWorkoutUpdate();
  }

  /**
   * Process a single frame (called by frame processing loop)
   */
  private processFrame(): void {
    if (!this.videoElement || !this.canvasElement) {
      return;
    }

    // Get prediction from pose detection model
    const result = this.dependencies.predictionAdapter.process(
      this.videoElement
    );

    if (!result) {
      return;
    }

    const { bestPrediction } = result;

    // Render the prediction
    this.dependencies.rendererAdapter.render({
      source: this.videoElement,
      target: this.canvasElement,
      prediction: bestPrediction,
      confidenceThreshold: 0.5,
    });

    // Detect reps when Running or in StopCountdown
    if (
      (this.state === SessionState.Running ||
        this.state === SessionState.StopCountdown) &&
      this.currentWorkout
    ) {
      this.detectRep(bestPrediction);
    }
  }

  /**
   * Detect rep from prediction and update workout
   */
  private detectRep(prediction: Prediction): void {
    if (!this.currentWorkout) {
      return;
    }

    const rep = this.dependencies.repDetectionService.detectRep(prediction);

    if (rep) {
      this.currentWorkout.addRep(rep);

      // Check for rep-based audio feedback
      this.checkRepAudioFeedback();

      // Emit workout updated event
      this.emitWorkoutUpdate();
    }
  }

  /**
   * Start the countdown before workout begins (configurable duration)
   */
  private startCountdown(): void {
    const settings = this.dependencies.settingsAdapter.getSettings();
    this.countdownValue = settings.startCountdownSeconds;

    // Skip countdown if set to 0
    if (this.countdownValue === 0) {
      this.completeCountdown();
      return;
    }

    this.setState(SessionState.StartCountdown, this.countdownValue);

    // Beep immediately if starting at 3 or less and audio feedback is enabled
    if (this.countdownValue <= 3 && settings.audioFeedbackEnabled) {
      this.dependencies.beeperAdapter.countdownBeep();
    }

    this.countdownInterval = window.setInterval(() => {
      this.countdownValue--;

      if (this.countdownValue > 0) {
        // Update countdown
        this.setState(SessionState.StartCountdown, this.countdownValue);

        // Beep on last 3 seconds if audio feedback is enabled
        if (this.countdownValue <= 3 && settings.audioFeedbackEnabled) {
          this.dependencies.beeperAdapter.countdownBeep();
        }
      } else {
        // Countdown complete - start the workout
        this.completeCountdown();
      }
    }, 1000);
  }

  /**
   * Complete countdown and transition to Running state
   */
  private async completeCountdown(): Promise<void> {
    // Clear countdown interval
    if (this.countdownInterval !== null) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }

    if (!this.currentWorkout) {
      throw new Error("No workout to start");
    }

    const settings = this.dependencies.settingsAdapter.getSettings();

    // Start the workout entity
    this.currentWorkout.start();

    // Conditionally start video recording based on settings (always record audio)
    if (settings.recordVideo) {
      const mediaStream = this.dependencies.cameraAdapter.getStream();
      if (mediaStream && this.currentWorkout) {
        try {
          await this.dependencies.workoutRepo.startRecording(
            this.currentWorkout.id,
            mediaStream,
            settings.videoFormat,
            settings.videoQuality
          );
          this.isVideoRecording = true;
        } catch (error) {
          console.warn("Failed to start video recording:", error);
          this.isVideoRecording = false;
        }
      }
    }

    // Quick beep on workout start if audio feedback is enabled
    if (settings.audioFeedbackEnabled) {
      this.dependencies.beeperAdapter.quickBeep();
    }

    // Reset rep detection state machine
    this.dependencies.repDetectionService.reset();

    // Reset audio feedback tracking
    this.lastRepBeepCount = 0;
    this.lastTimeBeep = Date.now();

    // Start timer for periodic updates
    this.startTimer();

    // Setup auto-stop if configured
    this.setupAutoStop();

    // Transition to Running state
    this.setState(SessionState.Running);

    // Emit initial stats
    this.emitWorkoutUpdate();
  }

  /**
   * Start frame processing loop using requestAnimationFrame
   */
  private startFrameProcessing(): void {
    if (this.frameProcessingRAF !== null) {
      return;
    }

    // Get target FPS from settings
    const settings = this.dependencies.settingsAdapter.loadSettings();
    const targetFPS = settings.fps;
    this.targetFrameInterval = 1000 / targetFPS;
    
    // Reset timing
    this.lastFrameTime = performance.now();

    // Start RAF loop
    const frameLoop = (currentTime: number) => {
      // Calculate time elapsed since last frame
      const elapsed = currentTime - this.lastFrameTime;

      // Only process frame if enough time has passed (throttle to target FPS)
      if (elapsed >= this.targetFrameInterval) {
        this.lastFrameTime = currentTime - (elapsed % this.targetFrameInterval);
        this.processFrame();
      }

      // Schedule next frame (will auto-pause when tab is hidden)
      this.frameProcessingRAF = requestAnimationFrame(frameLoop);
    };

    this.frameProcessingRAF = requestAnimationFrame(frameLoop);
  }

  /**
   * Stop frame processing loop
   */
  private stopFrameProcessing(): void {
    if (this.frameProcessingRAF !== null) {
      cancelAnimationFrame(this.frameProcessingRAF);
      this.frameProcessingRAF = null;
    }
  }

  /**
   * Start timer for periodic workout updates (every second)
   */
  private startTimer(): void {
    if (this.timerInterval !== null) {
      return;
    }

    this.timerInterval = window.setInterval(() => {
      if (this.currentWorkout && this.currentWorkout.isActive()) {
        // Check for time-based audio feedback
        this.checkTimeAudioFeedback();

        // Emit workout update
        this.emitWorkoutUpdate();
      }
    }, 1000);
  }

  /**
   * Stop timer
   */
  private stopTimer(): void {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  /**
   * Emit workout updated event
   */
  private emitWorkoutUpdate(): void {
    if (!this.currentWorkout) {
      return;
    }

    const stats = this.currentWorkout.getStats();
    this.dependencies.eventBus.publish(
      new WorkoutUpdatedEvent({
        workoutId: this.currentWorkout.id,
        stats,
      })
    );
  }

  /**
   * Set state and emit event
   */
  private setState(newState: SessionState, countdown?: number): void {
    this.state = newState;

    this.dependencies.eventBus.publish(
      new SessionStateChangedEvent({
        state: newState,
        countdown,
      })
    );
  }

  /**
   * Setup auto-stop timer if configured
   */
  private setupAutoStop(): void {
    const settings = this.dependencies.settingsAdapter.getSettings();
    const autoStopMs = settings.autoStopWorkoutTime
      ? this.parseTimeToMs(settings.autoStopWorkoutTime)
      : null;

    if (!autoStopMs) {
      return;
    }

    // Calculate when to start the stop countdown
    // We display the countdown immediately, so we need to subtract (countdown * 1000)
    // For example: if auto-stop is 15s and countdown is 5s, we start at 10s
    // At 10s: display "5", at 11s: display "4", ..., at 15s: stop
    // If countdown is null, just stop immediately at the auto-stop time
    const stopCountdownSeconds = settings.stopWorkoutCountdown ?? 0;
    const stopCountdownDuration = stopCountdownSeconds * 1000;
    const timeUntilStopCountdown = autoStopMs - stopCountdownDuration;

    if (timeUntilStopCountdown > 0) {
      this.autoStopTimer = window.setTimeout(() => {
        this.startStopCountdown(stopCountdownSeconds);
      }, timeUntilStopCountdown);
    }
  }

  /**
   * Start stop countdown before auto-stopping workout
   */
  private startStopCountdown(seconds: number): void {
    if (this.state !== SessionState.Running) {
      return;
    }

    this.countdownValue = seconds;
    const settings = this.dependencies.settingsAdapter.getSettings();

    // Transition to StopCountdown state
    this.setState(SessionState.StopCountdown, this.countdownValue);

    // Beep immediately if on last 3 seconds
    if (this.countdownValue <= 3 && settings.audioFeedbackEnabled) {
      this.dependencies.beeperAdapter.countdownBeep();
    }

    this.stopCountdownInterval = window.setInterval(() => {
      this.countdownValue--;

      if (this.countdownValue > 0) {
        // Update countdown state
        this.setState(SessionState.StopCountdown, this.countdownValue);

        // Beep on last 3 seconds if audio feedback is enabled
        if (this.countdownValue <= 3 && settings.audioFeedbackEnabled) {
          this.dependencies.beeperAdapter.countdownBeep();
        }
      } else {
        // Countdown complete - stop the workout
        if (this.stopCountdownInterval !== null) {
          clearInterval(this.stopCountdownInterval);
          this.stopCountdownInterval = null;
        }
        this.stopWorkout();
      }
    }, 1000);
  }

  /**
   * Clear auto-stop timer and stop countdown
   */
  private clearAutoStopTimer(): void {
    if (this.autoStopTimer !== null) {
      clearTimeout(this.autoStopTimer);
      this.autoStopTimer = null;
    }
    if (this.stopCountdownInterval !== null) {
      clearInterval(this.stopCountdownInterval);
      this.stopCountdownInterval = null;
    }
  }

  /**
   * Check and trigger rep-based audio feedback
   */
  private checkRepAudioFeedback(): void {
    if (!this.currentWorkout) {
      return;
    }

    const settings = this.dependencies.settingsAdapter.getSettings();
    if (!settings.audioFeedbackEnabled || !settings.audioFeedbackRepInterval) {
      return;
    }

    const currentRepCount = this.currentWorkout.getRepCount();
    const repsSinceLastBeep = currentRepCount - this.lastRepBeepCount;

    if (repsSinceLastBeep >= settings.audioFeedbackRepInterval) {
      this.dependencies.beeperAdapter.quickBeep();
      this.lastRepBeepCount = currentRepCount;
    }
  }

  /**
   * Check and trigger time-based audio feedback
   */
  private checkTimeAudioFeedback(): void {
    const settings = this.dependencies.settingsAdapter.getSettings();
    if (!settings.audioFeedbackEnabled || !settings.audioFeedbackTimeInterval) {
      return;
    }

    const intervalMs = this.parseTimeToMs(settings.audioFeedbackTimeInterval);
    if (!intervalMs) {
      return;
    }

    const now = Date.now();
    const timeSinceLastBeep = now - this.lastTimeBeep;

    if (timeSinceLastBeep >= intervalMs) {
      this.dependencies.beeperAdapter.quickBeep();
      this.lastTimeBeep = now;
    }
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
   * Cleanup resources
   */
  private cleanup(): void {
    this.stopFrameProcessing();
    this.stopTimer();
    this.clearAutoStopTimer();

    if (this.countdownInterval !== null) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }

    this.dependencies.cameraAdapter.stop();

    if (this.canvasElement) {
      this.dependencies.rendererAdapter.clear(this.canvasElement);
    }

    this.videoElement = null;
    this.canvasElement = null;
    this.isVideoRecording = false;
  }

  /**
   * Get current state
   */
  getState(): SessionState {
    return this.state;
  }

  /**
   * Get current workout
   */
  getCurrentWorkout(): WorkoutEntity | null {
    return this.currentWorkout;
  }
}

// Export singleton instance
export const workoutSessionManager = new WorkoutSessionManager({
  cameraAdapter,
  predictionAdapter,
  rendererAdapter: predictionRendererAdapter,
  repDetectionService,
  workoutRepo: workoutStorageAdapter,
  eventBus,
  settingsAdapter: settingsStorageAdapter,
  beeperAdapter,
});
