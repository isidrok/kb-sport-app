import { CameraService } from "./camera.service";
import { PredictionService } from "./prediction.service";
import { RenderingService } from "./rendering.service";
import { RepCountingService, WorkoutSession } from "./rep-counting.service";
import { PredictionAnalysisService } from "./prediction-analysis.service";
import { StorageService } from "./storage.service";

export type AppState = 'idle' | 'countdown' | 'active';

export interface WorkoutState {
  appState: AppState;
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

    // Get canvas dimensions for camera setup
    const { width, height } = canvas.getBoundingClientRect();
    await this.services.camera.start(width, height, video);
    this.startCountdown(video, canvas);
  }

  async stop(): Promise<void> {
    this.stopProcessing();

    const session = this.services.repCounting.stop();
    if (session) {
      await this.services.storage.stopRecording(session);
      this.setState('idle', { session: { ...session } });
    } else {
      this.setState('idle', { countdown: null });
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

      if (this.state === 'active') {
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

  private handleActiveFrame(bestPrediction: any): void {
    const repDetection = this.services.analysis.analyzeForRep(bestPrediction);

    // Debug logging to see what's happening
    if (repDetection.confidence > 0.1) {
      console.log('Rep detection:', {
        detected: repDetection.detected,
        armType: repDetection.armType,
        confidence: repDetection.confidence,
        timestamp: repDetection.timestamp
      });
    }

    if (repDetection.detected) {
      console.log('🏋️ REP DETECTED!', repDetection);
      this.services.repCounting.addRep(repDetection.armType, repDetection.timestamp);
    }

    const session = this.services.repCounting.getCurrentSession();
    this.setState(this.state, { session: session ? { ...session } : null });
  }

  private startCountdown(video: HTMLVideoElement, canvas: HTMLCanvasElement): void {
    this.setState('countdown');
    this.startProcessingLoop(video, canvas);

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
    // Setup analysis
    this.services.analysis.resetState();

    // Start session and recording
    this.services.repCounting.start();
    const stream = video.srcObject as MediaStream;
    await this.services.storage.startRecording(stream);

    this.setState('active');
  }
}