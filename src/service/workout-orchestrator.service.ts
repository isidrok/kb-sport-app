import { CameraService } from "./camera.service";
import { PredictionService } from "./prediction.service";
import { RenderingService } from "./rendering.service";
import { WorkoutService, WorkoutSession } from "./workout.service";
import { StorageService } from "./storage.service";

export type AppState = 'idle' | 'calibrating' | 'countdown' | 'active';

export interface WorkoutCallbacks {
  onStateChange: (state: AppState) => void;
  onCalibrationProgress: (progress: number) => void;
  onCountdown: (count: number | null) => void;
  onSessionUpdate: (session: WorkoutSession | null) => void;
  onError: (error: string) => void;
}

export class WorkoutOrchestratorService {
  private state: AppState = 'idle';
  private animationFrameId: number | null = null;
  private countdownInterval: number | null = null;
  
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private containerElement: HTMLDivElement | null = null;
  
  private callbacks: WorkoutCallbacks;
  
  private readonly services = {
    camera: new CameraService(),
    prediction: new PredictionService(),
    rendering: new RenderingService(),
    workout: new WorkoutService(),
    storage: new StorageService(),
  };

  constructor(callbacks: WorkoutCallbacks) {
    this.callbacks = callbacks;
  }

  async initialize(): Promise<void> {
    try {
      await this.services.prediction.initialize();
      await this.services.storage.initialize();
    } catch (error) {
      this.callbacks.onError(`Failed to initialize services: ${error}`);
      throw error;
    }
  }

  setElements(
    video: HTMLVideoElement, 
    canvas: HTMLCanvasElement, 
    container: HTMLDivElement
  ): void {
    this.videoElement = video;
    this.canvasElement = canvas;
    this.containerElement = container;
  }

  async startSession(): Promise<void> {
    if (!this.videoElement || !this.canvasElement || !this.containerElement) {
      this.callbacks.onError('Missing required DOM elements');
      return;
    }

    if (this.state !== 'idle') {
      this.callbacks.onError('Session already in progress');
      return;
    }

    try {
      // Clear previous session data when starting new session
      this.callbacks.onSessionUpdate(null);
      
      // Start camera
      const containerRect = this.containerElement.getBoundingClientRect();
      await this.services.camera.start(
        containerRect.width, 
        containerRect.height, 
        this.videoElement
      );

      // Start calibration
      this.services.workout.startCalibration();
      this.setState('calibrating');
      this.callbacks.onCalibrationProgress(0);
      
      // Start pose detection loop
      this.startPoseDetection();
    } catch (error) {
      this.callbacks.onError(`Failed to start session: ${error}`);
      this.setState('idle');
    }
  }

  async stopSession(): Promise<void> {
    try {
      // Stop detection loop
      this.stopPoseDetection();
      this.clearCountdown();

      // Stop workout session if active and preserve final stats
      const session = this.services.workout.endSession();
      if (session) {
        await this.services.storage.stopRecording(session);
        // Send final session stats to UI (don't clear them)
        this.callbacks.onSessionUpdate({ ...session });
      }

      // Stop camera
      this.services.camera.stop();
      
      // Reset state but keep session data
      this.setState('idle');
      this.callbacks.onCalibrationProgress(0);
      this.callbacks.onCountdown(null);
      // Note: NOT calling onSessionUpdate(null) to preserve stats
    } catch (error) {
      this.callbacks.onError(`Failed to stop session: ${error}`);
    }
  }

  dispose(): void {
    this.stopSession();
    this.services.prediction.dispose();
  }

  getCurrentState(): AppState {
    return this.state;
  }

  private setState(newState: AppState): void {
    this.state = newState;
    this.callbacks.onStateChange(newState);
  }

  private startPoseDetection(): void {
    const detectPoses = () => {
      if (!this.videoElement || !this.canvasElement || !this.containerElement || this.state === 'idle') {
        return;
      }

      try {
        const { bestPrediction } = this.services.prediction.process(this.videoElement);
        
        // Process pose for calibration or workout
        this.services.workout.processPose(bestPrediction);
        
        // Handle state transitions based on workout service state
        this.handleStateTransitions();

        // Render
        const containerRect = this.containerElement.getBoundingClientRect();
        this.services.rendering.render({
          source: this.videoElement,
          target: this.canvasElement,
          score: bestPrediction.score,
          box: bestPrediction.box,
          keypoints: bestPrediction.keypoints,
          width: containerRect.width,
          height: containerRect.height,
        });
      } catch (error) {
        console.error("Pose detection error:", error);
      }

      if (this.state === 'calibrating' || this.state === 'countdown' || this.state === 'active') {
        this.animationFrameId = requestAnimationFrame(detectPoses);
      }
    };

    detectPoses();
  }

  private stopPoseDetection(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private handleStateTransitions(): void {
    if (this.state === 'calibrating') {
      // Update calibration progress
      this.callbacks.onCalibrationProgress(this.services.workout.getCalibrationProgress());
      
      // Check if calibration completed
      if (this.services.workout.isCalibrated() && !this.services.workout.isCalibrationActive()) {
        this.setState('countdown');
        this.startCountdown();
      }
    } else if (this.state === 'active') {
      // Update session data
      const session = this.services.workout.getCurrentSession();
      this.callbacks.onSessionUpdate(session ? { ...session } : null);
    }
  }

  private startCountdown(): void {
    let count = 3;
    this.callbacks.onCountdown(count);
    
    this.countdownInterval = window.setInterval(() => {
      count--;
      if (count > 0) {
        this.callbacks.onCountdown(count);
      } else {
        this.clearCountdown();
        // Set state to active BEFORE clearing countdown to prevent flicker
        this.setState('active');
        this.callbacks.onCountdown(null);
        this.startWorkoutSession();
      }
    }, 1000);
  }

  private clearCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  private async startWorkoutSession(): Promise<void> {
    try {
      this.services.workout.startSession();
      
      const stream = this.videoElement!.srcObject as MediaStream;
      await this.services.storage.startRecording(stream);

      // State is already set to 'active' in countdown, so no need to set it again
    } catch (error) {
      this.callbacks.onError(`Failed to start workout session: ${error}`);
      this.setState('idle');
    }
  }
}