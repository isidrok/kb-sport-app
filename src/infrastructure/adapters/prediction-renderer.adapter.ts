import { Prediction } from "@/domain/types/rep-detection.types";

export interface PredictionRendererConfig {
  source: HTMLVideoElement;
  target: HTMLCanvasElement;
  prediction: Prediction;
  confidenceThreshold: number;
}

export class PredictionRendererAdapter {
  render(config: PredictionRendererConfig): void {
    const { target, source, prediction, confidenceThreshold } = config;
    const { box, keypoints, score } = prediction;

    // Skip rendering if prediction confidence is too low
    if (score < confidenceThreshold) {
      return;
    }

    const ctx = target.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to get 2D context from canvas");
    }

    ctx.clearRect(0, 0, target.width, target.height);

    this.drawVideo(ctx, source, target.width, target.height);
    this.drawBoundingBox(ctx, box, target.width);
    this.drawKeypoints(ctx, keypoints, target.width, confidenceThreshold);
  }

  clear(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  private drawVideo(
    ctx: CanvasRenderingContext2D,
    video: HTMLVideoElement,
    width: number,
    height: number,
  ): void {
    // Flip video horizontally for mirror effect
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -width, 0, width, height);
    ctx.restore();
  }

  private drawBoundingBox(
    ctx: CanvasRenderingContext2D,
    box: [number, number, number, number],
    width: number,
  ): void {
    const [x1, y1, x2, y2] = box;

    // Flip coordinates to match flipped video
    const flippedX1 = width - x2;
    const flippedX2 = width - x1;

    ctx.strokeStyle = "lime";
    ctx.lineWidth = 2;
    ctx.strokeRect(flippedX1, y1, flippedX2 - flippedX1, y2 - y1);
  }

  private drawKeypoints(
    ctx: CanvasRenderingContext2D,
    keypoints: [number, number, number][],
    width: number,
    confidenceThreshold: number,
  ): void {
    ctx.fillStyle = "red";

    for (const [x, y, confidence] of keypoints) {
      if (confidence > confidenceThreshold) {
        const flippedX = width - x;
        ctx.beginPath();
        ctx.arc(flippedX, y, 5, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  }
}

export const predictionRendererAdapter = new PredictionRendererAdapter();
