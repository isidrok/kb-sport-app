import { CameraService } from "./camera.service";
import { PredictionService } from "./prediction.service";
import { RenderingService } from "./rendering.service";
import { CalibrationService } from "./calibration.service";
import { RepCountingService, WorkoutSession } from "./rep-counting.service";
import { PredictionAnalysisService } from "./prediction-analysis.service";
import { StorageService } from "./storage.service";

export type AppState = 'idle' | 'calibrating' | 'countdown' | 'active';

export interface WorkoutState {
  appState: AppState;
  calibrationProgress: number;
  countdown: number | null;
  session: WorkoutSession | null;
}

export interface WorkoutCallbacks {
  onChange: (state: WorkoutState) => void;
}

export class WorkoutOrchestratorService {
  private state: AppState = 'idle';
  private animationFrameId: number | null = null;
  private countdownInterval: number | null = null;
  private callbacks: WorkoutCallbacks;

  private readonly services = {
    camera: new CameraService(),
    prediction: new PredictionService(),
    rendering: new RenderingService(),
    calibration: new CalibrationService(),
    analysis: new PredictionAnalysisService(),
    repCounting: new RepCountingService(),
    storage: new StorageService(),
  };

  constructor(callbacks: WorkoutCallbacks) {
    this.callbacks = callbacks;
  }

  async initialize(): Promise<void> {
    await Promise.all([
      this.services.prediction.initialize(),
      this.services.storage.initialize()
    ]);
  }

  async start(video: HTMLVideoElement, canvas: HTMLCanvasElement): Promise<void> {
    if (this.state !== 'idle') return;

    this.setState('calibrating', { session: null, calibrationProgress: 0 });

    // Get canvas dimensions for camera setup
    const { width, height } = canvas.getBoundingClientRect();
    await this.services.camera.start(width, height, video);
    this.services.calibration.start();
    this.startProcessingLoop(video, canvas);
  }

  async stop(): Promise<void> {
    this.stopProcessing();

    const session = this.services.repCounting.stop();
    if (session) {
      await this.services.storage.stopRecording(session);
      this.setState('idle', { session: { ...session } });
    } else {
      this.setState('idle', { calibrationProgress: 0, countdown: null });
    }

    this.services.camera.stop();
  }

  dispose(): void {
    this.stop();
    this.services.prediction.dispose();
  }

  private setState(newState: AppState, partialState: Partial<Omit<WorkoutState, 'appState'>> = {}): void {
    this.state = newState;
    const currentState: WorkoutState = {
      appState: newState,
      calibrationProgress: 0,
      countdown: null,
      session: null,
      ...partialState,
    };
    this.callbacks.onChange(currentState);
  }

  private stopProcessing(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  private startProcessingLoop(video: HTMLVideoElement, canvas: HTMLCanvasElement): void {
    const processFrame = () => {
      if (this.state === 'idle') return;

      const { bestPrediction } = this.services.prediction.process(video);

      if (this.state === 'calibrating') {
        this.handleCalibrationFrame(bestPrediction, video);
      } else if (this.state === 'active') {
        this.handleActiveFrame(bestPrediction);
      }

      // Render frame
      const { width, height } = canvas.getBoundingClientRect();
      this.services.rendering.render({
        source: video,
        target: canvas,
        score: bestPrediction.score,
        box: bestPrediction.box,
        keypoints: bestPrediction.keypoints,
        width,
        height,
      });

      this.animationFrameId = requestAnimationFrame(processFrame);
    };

    processFrame();
  }

  private handleCalibrationFrame(bestPrediction: any, video: HTMLVideoElement): void {
    this.services.calibration.process(bestPrediction);
    this.setState(this.state, {
      calibrationProgress: this.services.calibration.getCalibrationProgress()
    });

    if (this.services.calibration.isCalibrated()) {
      this.startCountdown(video);
    }
  }

  private handleActiveFrame(bestPrediction: any): void {
    const repDetection = this.services.analysis.analyzeForRep(bestPrediction);

    if (repDetection.detected) {
      this.services.repCounting.addRep(repDetection.armType, repDetection.timestamp);
    }

    const session = this.services.repCounting.getCurrentSession();
    this.setState(this.state, { session: session ? { ...session } : null });
  }

  private startCountdown(video: HTMLVideoElement): void {
    this.setState('countdown');

    let count = 3;
    this.setState(this.state, { countdown: count });

    this.countdownInterval = window.setInterval(() => {
      count--;
      if (count > 0) {
        this.setState(this.state, { countdown: count });
      } else {
        this.stopCountdown();
        this.transitionToActiveWorkout(video);
      }
    }, 1000);
  }

  private stopCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    this.setState(this.state, { countdown: null });
  }

  private async transitionToActiveWorkout(video: HTMLVideoElement): Promise<void> {
    // Setup analysis with calibration thresholds
    const thresholds = this.services.calibration.getThresholds()!;
    this.services.analysis.setThresholds(thresholds);
    this.services.analysis.resetState();

    // Start session and recording
    this.services.repCounting.start();
    const stream = video.srcObject as MediaStream;
    await this.services.storage.startRecording(stream);

    this.setState('active');
  }
}