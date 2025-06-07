import type { BoundingBox, Keypoint } from "./prediction.service";

const RENDERING_CONFIG = {
  CONFIDENCE_THRESHOLD: 0.5,
  BOUNDING_BOX: {
    COLOR: "lime",
    LINE_WIDTH: 2,
  },
  KEYPOINTS: {
    COLOR: "red",
    RADIUS: 5,
  },
} as const;

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
    if (score < RENDERING_CONFIG.CONFIDENCE_THRESHOLD) {
      return;
    }

    // Use provided dimensions or get from canvas
    const width = props.width ?? target.width;
    const height = props.height ?? target.height;

    // Set up canvas
    target.width = width;
    target.height = height;
    const ctx = target.getContext("2d")!;
    ctx.clearRect(0, 0, width, height);

    this.drawVideo(ctx, source, width, height);
    this.drawBoundingBox(ctx, box, width);
    this.drawKeypoints(ctx, keypoints, width);
  }

  private drawVideo(ctx: CanvasRenderingContext2D, video: HTMLVideoElement, width: number, height: number): void {
    // Flip video horizontally for mirror effect
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -width, 0, width, height);
    ctx.restore();
  }

  private drawBoundingBox(ctx: CanvasRenderingContext2D, box: BoundingBox, width: number): void {
    const [x1, y1, x2, y2] = box;

    // Flip coordinates to match flipped video
    const flippedX1 = width - x2;
    const flippedX2 = width - x1;

    ctx.strokeStyle = RENDERING_CONFIG.BOUNDING_BOX.COLOR;
    ctx.lineWidth = RENDERING_CONFIG.BOUNDING_BOX.LINE_WIDTH;
    ctx.strokeRect(flippedX1, y1, flippedX2 - flippedX1, y2 - y1);
  }

  private drawKeypoints(ctx: CanvasRenderingContext2D, keypoints: Keypoint[], width: number): void {
    ctx.fillStyle = RENDERING_CONFIG.KEYPOINTS.COLOR;

    for (const [x, y, confidence] of keypoints) {
      if (confidence > RENDERING_CONFIG.CONFIDENCE_THRESHOLD) {
        const flippedX = width - x;
        ctx.beginPath();
        ctx.arc(flippedX, y, RENDERING_CONFIG.KEYPOINTS.RADIUS, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  }
}
