import { CameraService } from "./camera.service";
import { PredictionService } from "./prediction.service";
import { RenderingService } from "./rendering.service";
import { RepCountingService, WorkoutSession } from "./rep-counting.service";
import { PredictionAnalysisService } from "./prediction-analysis.service";
import { StorageService } from "./storage.service";

export class WorkoutOrchestratorService {
  private animationFrameId: number | null = null;
  private isWorkoutActive = false;
  private onChange: (session: WorkoutSession | null) => void;

  private readonly services = {
    camera: new CameraService(),
    prediction: new PredictionService(),
    rendering: new RenderingService(),
    analysis: new PredictionAnalysisService(),
    repCounting: new RepCountingService(),
    storage: new StorageService(),
  };

  constructor(onChange: (session: WorkoutSession | null) => void) {
    this.onChange = onChange;
  }

  async initialize(): Promise<void> {
    await Promise.all([
      this.services.prediction.initialize(),
      this.services.storage.initialize(),
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

    // Start session and recording
    this.services.repCounting.start();
    const stream = video.srcObject as MediaStream;
    await this.services.storage.startRecording(stream);

    this.isWorkoutActive = true;
  }

  async stop(): Promise<void> {
    this.stopProcessing();
    this.isWorkoutActive = false;

    const session = this.services.repCounting.stop();
    if (session) {
      await this.services.storage.stopRecording(session);
      this.onChange({ ...session });
    }

    this.services.camera.stop();
  }

  dispose(): void {
    this.stop();
    this.services.prediction.dispose();
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
    this.onChange(session ? { ...session } : null);
  }
}
