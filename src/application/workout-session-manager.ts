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
import { workoutStorageAdapter, type WorkoutStorageAdapter } from "@/infrastructure/adapters/workout-storage.adapter";
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
import { CountdownService } from "./services/countdown.service";
import { AudioFeedbackService } from "./services/audio-feedback.service";
import { VideoRecordingService } from "./services/video-recording.service";
import { FrameProcessingService } from "./services/frame-processing.service";
import { AutoStopService } from "./services/auto-stop.service";
import { storageCheckService, type StorageCheckService } from "./services/storage-check.service";

interface WorkoutSessionManagerDependencies {
  cameraAdapter: CameraAdapter;
  predictionAdapter: PredictionAdapter;
  rendererAdapter: PredictionRendererAdapter;
  repDetectionService: RepDetectionService;
  workoutRepo: WorkoutStorageAdapter;
  eventBus: EventBus;
  settingsAdapter: SettingsStorageAdapter;
  beeperAdapter: BeeperAdapter;
  storageCheckService: StorageCheckService;
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
 * - Orchestrating specialized services (countdown, audio, recording, etc.)
 * - Event emission for UI updates
 */
export class WorkoutSessionManager {
  private state: SessionState = SessionState.Idle;
  private currentWorkout: WorkoutEntity | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private timerInterval: number | null = null;

  // Specialized services
  private startCountdownService: CountdownService; // For start countdown
  private stopCountdownService: CountdownService; // For stop countdown
  private audioFeedbackService: AudioFeedbackService;
  private videoRecordingService: VideoRecordingService;
  private frameProcessingService: FrameProcessingService;
  private autoStopService: AutoStopService;

  constructor(private dependencies: WorkoutSessionManagerDependencies) {
    // Initialize services
    this.startCountdownService = new CountdownService(dependencies.beeperAdapter);
    this.stopCountdownService = new CountdownService(dependencies.beeperAdapter);
    this.audioFeedbackService = new AudioFeedbackService(
      dependencies.beeperAdapter
    );
    this.videoRecordingService = new VideoRecordingService(
      dependencies.workoutRepo,
      dependencies.storageCheckService
    );
    this.frameProcessingService = new FrameProcessingService(
      dependencies.predictionAdapter,
      dependencies.rendererAdapter
    );
    this.autoStopService = new AutoStopService();
  }

  /**
   * Start camera and frame processing
   * Helper method used by both preview and direct workout start
   */
  private async startCamera(
    videoElement: HTMLVideoElement,
    canvasElement: HTMLCanvasElement
  ): Promise<void> {
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
    const settings = this.dependencies.settingsAdapter.loadSettings();
    this.frameProcessingService.start(
      videoElement,
      canvasElement,
      settings.fps,
      {
        onPrediction: (prediction) => this.handlePrediction(prediction),
      }
    );

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

      // Start countdown
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

    const settings = this.dependencies.settingsAdapter.loadSettings();

    // Double beep on workout stop
    this.audioFeedbackService.playWorkoutStop(settings.audioFeedbackEnabled);

    // Stop the workout entity
    this.currentWorkout.stop();

    // Stop timer and auto-stop
    this.stopTimer();
    this.autoStopService.clear();

    // Stop frame processing
    this.frameProcessingService.stop();

    // Stop camera
    this.dependencies.cameraAdapter.stop();

    // Stop video recording and save if recording was active
    const videoSize = await this.videoRecordingService.stopRecording(
      this.currentWorkout.id
    );

    // Always save workout metadata
    try {
      await this.dependencies.workoutRepo.saveWorkout(
        this.currentWorkout,
        videoSize
      );
    } catch (error) {
      console.error("Failed to save workout:", error);
    }

    // Reset services
    this.videoRecordingService.reset();
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
   * Handle prediction from frame processing
   */
  private handlePrediction(prediction: Prediction): void {
    // Detect reps when Running or in StopCountdown
    if (
      (this.state === SessionState.Running ||
        this.state === SessionState.StopCountdown) &&
      this.currentWorkout
    ) {
      this.detectRep(prediction);
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
      const settings = this.dependencies.settingsAdapter.loadSettings();
      this.audioFeedbackService.checkRepFeedback(
        this.currentWorkout.getRepCount(),
        {
          enabled: settings.audioFeedbackEnabled,
          repInterval: settings.audioFeedbackRepInterval,
          timeInterval: settings.audioFeedbackTimeInterval,
        }
      );

      // Emit workout updated event
      this.emitWorkoutUpdate();
    }
  }

  /**
   * Start the countdown before workout begins (configurable duration)
   */
  private startCountdown(): void {
    const settings = this.dependencies.settingsAdapter.loadSettings();

    this.startCountdownService.startCountdown(
      settings.startCountdownSeconds,
      {
        onCountdownTick: (value) => {
          this.setState(SessionState.StartCountdown, value);
        },
        onCountdownComplete: () => {
          this.completeCountdown();
        },
      },
      settings.audioFeedbackEnabled
    );
  }

  /**
   * Complete countdown and transition to Running state
   */
  private async completeCountdown(): Promise<void> {
    if (!this.currentWorkout) {
      throw new Error("No workout to start");
    }

    const settings = this.dependencies.settingsAdapter.loadSettings();

    // Start the workout entity
    this.currentWorkout.start();

    // Start video recording if enabled
    const mediaStream = this.dependencies.cameraAdapter.getStream();
    if (mediaStream && this.currentWorkout) {
      await this.videoRecordingService.startRecording(
        this.currentWorkout.id,
        mediaStream,
        {
          enabled: settings.recordVideo,
          format: settings.videoFormat,
          quality: settings.videoQuality,
        }
      );
    }

    // Quick beep on workout start
    this.audioFeedbackService.playWorkoutStart(settings.audioFeedbackEnabled);

    // Reset services
    this.dependencies.repDetectionService.reset();
    this.audioFeedbackService.reset();

    // Start timer for periodic updates
    this.startTimer();

    // Setup auto-stop if configured
    this.autoStopService.setup(
      {
        autoStopTime: settings.autoStopWorkoutTime,
        stopCountdownSeconds: settings.stopWorkoutCountdown,
      },
      {
        onStopCountdownStart: (seconds) => {
          this.startStopCountdown(seconds);
        },
      }
    );

    // Transition to Running state
    this.setState(SessionState.Running);

    // Emit initial stats
    this.emitWorkoutUpdate();
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
        const settings = this.dependencies.settingsAdapter.loadSettings();
        this.audioFeedbackService.checkTimeFeedback({
          enabled: settings.audioFeedbackEnabled,
          repInterval: settings.audioFeedbackRepInterval,
          timeInterval: settings.audioFeedbackTimeInterval,
        });

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
   * Start stop countdown before auto-stopping workout
   */
  private startStopCountdown(seconds: number): void {
    if (this.state !== SessionState.Running) {
      return;
    }

    const settings = this.dependencies.settingsAdapter.loadSettings();

    this.stopCountdownService.startCountdown(
      seconds,
      {
        onCountdownTick: (value) => {
          this.setState(SessionState.StopCountdown, value);
        },
        onCountdownComplete: () => {
          this.stopWorkout();
        },
      },
      settings.audioFeedbackEnabled
    );
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    this.frameProcessingService.stop();
    this.stopTimer();
    this.autoStopService.clear();
    this.startCountdownService.stopCountdown();
    this.stopCountdownService.stopCountdown();

    this.dependencies.cameraAdapter.stop();

    if (this.canvasElement) {
      this.dependencies.rendererAdapter.clear(this.canvasElement);
    }

    this.canvasElement = null;
    this.videoRecordingService.reset();
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
  storageCheckService,
});
