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

interface WorkoutSessionManagerDependencies {
  cameraAdapter: CameraAdapter;
  predictionAdapter: PredictionAdapter;
  rendererAdapter: PredictionRendererAdapter;
  repDetectionService: RepDetectionService;
  workoutRepo: IWorkoutRepository;
  eventBus: EventBus;
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
  private frameProcessingInterval: number | null = null;
  private countdownInterval: number | null = null;
  private timerInterval: number | null = null;
  private countdownValue: number = 0;

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
    if (this.state !== SessionState.Running) {
      throw new Error(`Cannot stop workout from state: ${this.state}`);
    }

    if (!this.currentWorkout) {
      throw new Error("No active workout to stop");
    }

    // Stop the workout entity
    this.currentWorkout.stop();

    // Stop timer and frame processing
    this.stopTimer();
    this.stopFrameProcessing();

    // Stop camera
    this.dependencies.cameraAdapter.stop();

    // Stop video recording and save
    try {
      const { sizeInBytes } = await this.dependencies.workoutRepo.stopRecording(
        this.currentWorkout.id
      );
      await this.dependencies.workoutRepo.saveWorkout(
        this.currentWorkout,
        sizeInBytes
      );
    } catch (error) {
      console.error("Failed to save workout:", error);
    }

    // Reset rep detection state
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

    // Only detect reps when in Running state
    if (this.state === SessionState.Running && this.currentWorkout) {
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

      // Emit workout updated event
      this.emitWorkoutUpdate();
    }
  }

  /**
   * Start the countdown (3, 2, 1) before workout begins
   */
  private startCountdown(): void {
    this.countdownValue = 3;
    this.setState(SessionState.StartCountdown, this.countdownValue);

    this.countdownInterval = window.setInterval(() => {
      this.countdownValue--;

      if (this.countdownValue > 0) {
        // Update countdown
        this.setState(SessionState.StartCountdown, this.countdownValue);
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

    // Start the workout entity
    this.currentWorkout.start();

    // Start video recording
    const mediaStream = this.dependencies.cameraAdapter.getStream();
    if (mediaStream && this.currentWorkout) {
      try {
        await this.dependencies.workoutRepo.startRecording(
          this.currentWorkout.id,
          mediaStream
        );
      } catch (error) {
        console.warn("Failed to start video recording:", error);
      }
    }

    // Reset rep detection state machine
    this.dependencies.repDetectionService.reset();

    // Start timer for periodic updates
    this.startTimer();

    // Transition to Running state
    this.setState(SessionState.Running);

    // Emit initial stats
    this.emitWorkoutUpdate();
  }

  /**
   * Start frame processing loop
   */
  private startFrameProcessing(): void {
    if (this.frameProcessingInterval !== null) {
      return;
    }

    // Process frames at ~30 FPS
    this.frameProcessingInterval = window.setInterval(() => {
      this.processFrame();
    }, 1000 / 30);
  }

  /**
   * Stop frame processing loop
   */
  private stopFrameProcessing(): void {
    if (this.frameProcessingInterval !== null) {
      clearInterval(this.frameProcessingInterval);
      this.frameProcessingInterval = null;
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
   * Cleanup resources
   */
  private cleanup(): void {
    this.stopFrameProcessing();
    this.stopTimer();

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
});
