import type { BoundingBox, Keypoint } from "./prediction.service";

/** Props for rendering predictions on canvas */
export interface RenderPredictionProps {
  source: HTMLVideoElement;
  target: HTMLCanvasElement;
  score: number;
  box: BoundingBox;
  keypoints: Keypoint[];
  width: number;
  height: number;
}

export class RenderingService {
  /**
   * Render pose estimation prediction on a canvas.
   * Draws the original image, bounding box, and keypoints with confidence above threshold.
   *
   * @param props - Rendering configuration including canvas, prediction data, and source image
   */
  render(props: RenderPredictionProps): void {
    const CONFIDENCE_THRESHOLD = 0.5;
    const { target, box, keypoints, source, score, width, height } = props;

    // Skip rendering if prediction confidence is too low
    if (score < CONFIDENCE_THRESHOLD) {
      return;
    }

    // Set up canvas
    target.width = width;
    target.height = height;
    const ctx = target.getContext("2d")!;
    ctx.clearRect(0, 0, width, height);

    // Flip video horizontally
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(source, -width, 0, width, height);
    ctx.restore();

    // Draw bounding box (flip coordinates to match flipped video)
    const [x1, y1, x2, y2] = box;
    const flippedX1 = width - x2;
    const flippedX2 = width - x1;
    ctx.strokeStyle = "lime";
    ctx.lineWidth = 2;
    ctx.strokeRect(flippedX1, y1, flippedX2 - flippedX1, y2 - y1);

    // Draw keypoints (flip coordinates to match flipped video)
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
