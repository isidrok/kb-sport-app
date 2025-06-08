import { CameraService } from "./camera.service";
import { PredictionService } from "./prediction.service";
import { RenderingService } from "./rendering.service";
import { RepCountingService, WorkoutSession } from "./rep-counting.service";
import { PredictionAnalysisService } from "./prediction-analysis.service";
import { StorageService } from "./storage.service";
import { AudioFeedbackService } from "./audio-feedback.service";
import { WorkoutSettings } from "../ui/WorkoutSettings";

export class WorkoutOrchestratorService {
  private animationFrameId: number | null = null;
  private isWorkoutActive = false;
  private onChange: (session: WorkoutSession | null) => void;
  private onSessionEndCountdown?: (countdown: number | null) => void;
  private onAutoStop?: () => void;
  private settings: WorkoutSettings;

  private readonly services = {
    camera: new CameraService(),
    prediction: new PredictionService(),
    rendering: new RenderingService(),
    analysis: new PredictionAnalysisService(),
    repCounting: new RepCountingService(),
    storage: new StorageService(),
    audioFeedback: null as AudioFeedbackService | null,
  };

  constructor(
    settings: WorkoutSettings,
    onChange: (session: WorkoutSession | null) => void,
    onSessionEndCountdown?: (countdown: number | null) => void,
    onAutoStop?: () => void
  ) {
    this.settings = settings;
    this.onChange = onChange;
    this.onSessionEndCountdown = onSessionEndCountdown;
    this.onAutoStop = onAutoStop;
  }

  async initialize(): Promise<void> {
    // Initialize audio feedback service
    this.services.audioFeedback = new AudioFeedbackService(this.settings, this.onSessionEndCountdown, this.onAutoStop);
    
    await Promise.all([
      this.services.prediction.initialize(),
      this.services.storage.initialize(),
      this.services.audioFeedback.initialize(),
    ]);
  }

  async prepareCamera(
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement
  ): Promise<void> {
    // Get canvas dimensions for camera setup
    const { width, height } = canvas.getBoundingClientRect();
    video.width = width;
    video.height = height;
    canvas.width = width;
    canvas.height = height;
    await this.services.camera.start(width, height, video);
    this.startProcessingLoop(video, canvas);
  }

  async startWorkout(video: HTMLVideoElement): Promise<void> {
    // Setup analysis
    this.services.analysis.resetState();

    // Start session NOW (not during countdown)
    this.services.repCounting.start();
    
    const stream = video.srcObject as MediaStream;
    await this.services.storage.startRecording(stream);

    // Start audio feedback session
    const session = this.services.repCounting.getCurrentSession();
    if (this.services.audioFeedback && session) {
      this.services.audioFeedback.startSession(session);
    }

    this.isWorkoutActive = true;
  }

  async stop(): Promise<WorkoutSession | null> {
    this.stopProcessing();
    this.isWorkoutActive = false;

    const session = this.services.repCounting.stop();
    
    if (session) {
      await this.services.storage.stopRecording(session);
      
      // End audio feedback session (manual stop)
      if (this.services.audioFeedback) {
        await this.services.audioFeedback.endSession(session, true);
      }
    } else if (this.services.audioFeedback) {
      // Stop audio feedback even if no session
      this.services.audioFeedback.stopSession();
    }

    this.services.camera.stop();
    return session;
  }

  getCurrentSession(): WorkoutSession | null {
    return this.services.repCounting.getCurrentSession();
  }

  updateSettings(settings: WorkoutSettings): void {
    this.settings = settings;
    if (this.services.audioFeedback) {
      this.services.audioFeedback.updateSettings(settings);
    }
  }

  getSettings(): WorkoutSettings {
    return this.settings;
  }

  // Audio feedback methods
  async playCountdownBeep(): Promise<void> {
    if (this.services.audioFeedback) {
      await this.services.audioFeedback.playCountdownBeep();
    }
  }

  async playStartBeep(): Promise<void> {
    if (this.services.audioFeedback) {
      await this.services.audioFeedback.playStartBeep();
    }
  }

  isAudioAvailable(): boolean {
    return this.services.audioFeedback?.isAudioAvailable() ?? false;
  }

  isSpeechAvailable(): boolean {
    return this.services.audioFeedback?.isSpeechAvailable() ?? false;
  }

  dispose(): void {
    this.stop();
    this.services.prediction.dispose();
    if (this.services.audioFeedback) {
      this.services.audioFeedback.dispose();
    }
  }

  private stopProcessing(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private startProcessingLoop(
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement
  ): void {
    const processFrame = () => {
      const { bestPrediction } = this.services.prediction.process(video);

      if (this.isWorkoutActive) {
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

    if (repDetection.detected) {
      this.services.repCounting.addRep(
        repDetection.armType,
        repDetection.timestamp
      );
    }

    const session = this.services.repCounting.getCurrentSession();
    if (session) {
      // Handle audio feedback for session updates
      if (this.services.audioFeedback) {
        this.services.audioFeedback.handleSessionUpdate(session);
      }
      
      this.onChange({ ...session });
    } else {
      this.onChange(null);
    }
  }
}
