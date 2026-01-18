import { type PredictionAdapter } from "@/infrastructure/adapters/prediction.adapter";
import { type PredictionRendererAdapter } from "@/infrastructure/adapters/prediction-renderer.adapter";
import { type Prediction } from "@/domain/types/rep-detection.types";

export interface FrameProcessingCallbacks {
  onPrediction: (prediction: Prediction) => void;
}

/**
 * Service responsible for managing frame processing loop with FPS control
 */
export class FrameProcessingService {
  private frameProcessingRAF: number | null = null;
  private lastFrameTime: number = 0;
  private targetFrameInterval: number = 1000 / 12; // Default 12 FPS
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private callbacks: FrameProcessingCallbacks | null = null;

  constructor(
    private predictionAdapter: PredictionAdapter,
    private rendererAdapter: PredictionRendererAdapter
  ) {}

  /**
   * Start frame processing loop
   */
  start(
    videoElement: HTMLVideoElement,
    canvasElement: HTMLCanvasElement,
    targetFPS: number,
    callbacks: FrameProcessingCallbacks
  ): void {
    this.stop(); // Clear any existing loop

    this.videoElement = videoElement;
    this.canvasElement = canvasElement;
    this.callbacks = callbacks;
    this.targetFrameInterval = 1000 / targetFPS;
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
  stop(): void {
    if (this.frameProcessingRAF !== null) {
      cancelAnimationFrame(this.frameProcessingRAF);
      this.frameProcessingRAF = null;
    }
    this.videoElement = null;
    this.canvasElement = null;
    this.callbacks = null;
  }

  /**
   * Update target FPS (useful if settings change mid-session)
   */
  updateFPS(targetFPS: number): void {
    this.targetFrameInterval = 1000 / targetFPS;
  }

  /**
   * Check if frame processing is active
   */
  isActive(): boolean {
    return this.frameProcessingRAF !== null;
  }

  /**
   * Process a single frame
   */
  private processFrame(): void {
    if (!this.videoElement || !this.canvasElement || !this.callbacks) {
      return;
    }

    // Get prediction from pose detection model
    const result = this.predictionAdapter.process(this.videoElement);

    if (!result) {
      return;
    }

    const { bestPrediction } = result;

    // Render the prediction
    this.rendererAdapter.render({
      source: this.videoElement,
      target: this.canvasElement,
      prediction: bestPrediction,
      confidenceThreshold: 0.5,
    });

    // Notify callback with prediction
    this.callbacks.onPrediction(bestPrediction);
  }
}
