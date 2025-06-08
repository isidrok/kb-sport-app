import type { BoundingBox, Keypoint } from "./prediction.service";
import { CONFIDENCE_THRESHOLD } from "../config/services.config";

/** Props for rendering predictions on canvas */
export interface RenderPredictionProps {
  source: HTMLVideoElement;
  target: HTMLCanvasElement;
  score: number;
  box: BoundingBox;
  keypoints: Keypoint[];
  width?: number;
  height?: number;
}

export class RenderingService {
  /**
   * Render pose estimation prediction on a canvas.
   * Draws the original image, bounding box, and keypoints with confidence above threshold.
   *
   * @param props - Rendering configuration including canvas, prediction data, and source image
   */
  render(props: RenderPredictionProps): void {
    const { target, box, keypoints, source, score } = props;

    // Skip rendering if prediction confidence is too low
    if (score < CONFIDENCE_THRESHOLD) {
      return;
    }

    // Use provided dimensions or get from canvas
    const width = props.width ?? target.width;
    const height = props.height ?? target.height;

    const ctx = target.getContext("2d")!;
    ctx.clearRect(0, 0, width, height);

    this.drawVideo(ctx, source, width, height);
    this.drawBoundingBox(ctx, box, width);
    this.drawKeypoints(ctx, keypoints, width);
  }

  private drawVideo(
    ctx: CanvasRenderingContext2D,
    video: HTMLVideoElement,
    width: number,
    height: number
  ): void {
    // Flip video horizontally for mirror effect
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -width, 0, width, height);
    ctx.restore();
  }

  private drawBoundingBox(
    ctx: CanvasRenderingContext2D,
    box: BoundingBox,
    width: number
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
    keypoints: Keypoint[],
    width: number
  ): void {
    ctx.fillStyle = "red";

    for (const [x, y, confidence] of keypoints) {
      if (confidence > CONFIDENCE_THRESHOLD) {
        const flippedX = width - x;
        ctx.beginPath();
        ctx.arc(flippedX, y, 5, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  }
}
