import { keypointNames, keypointConnections } from "./keypoints";
import { deepMerge } from "./utils";

export interface WhiteboardOptions {
  width: number;
  height: number;
  confidenceThreshold?: number;
  flipVideo?: boolean;
  drawLabels?: boolean;
  drawConnections?: boolean;
  format?: {
    keypointRadius?: number;
    keypointLabelOffset?: number;
    keypointLabelFont?: string;
    skeletonLineWidth?: number;
    keypointColor?: string;
    keypointLabelColor?: string;
    skeletonColor?: string;
  };
}

const DEFAULT_WHITEBOARD_OPTIONS: Partial<WhiteboardOptions> = {
  confidenceThreshold: 0.3,
  flipVideo: true,
  drawLabels: true,
  drawConnections: true,
  format: {
    keypointRadius: 5,
    keypointLabelOffset: 10,
    keypointLabelFont: "12px Arial",
    skeletonLineWidth: 2,
    keypointColor: "red",
    keypointLabelColor: "white",
    skeletonColor: "blue",
  },
};

export class Whiteboard {
  private ctx: CanvasRenderingContext2D;
  private options: WhiteboardOptions;

  constructor(canvas: HTMLCanvasElement, options: WhiteboardOptions) {
    if (!options.width || !options.height) {
      throw new Error("width and height are required");
    }
    this.ctx = canvas.getContext("2d")!;
    this.options = deepMerge(options, DEFAULT_WHITEBOARD_OPTIONS);
  }

  /**
   * Clears the canvas
   */
  clear() {
    this.ctx.clearRect(0, 0, this.options.width, this.options.height);
  }

  /**
   * Draws the video frame and pose detection results on the canvas
   * @param video The video element to draw
   * @param keypoints Array of [x, y, confidence] values for each keypoint
   */
  drawFrame(video: HTMLVideoElement, keypoints: number[][]) {
    // Clear canvas
    this.clear();

    // Draw video (flipped or not based on option)
    this.ctx.save();
    if (this.options.flipVideo) {
      this.ctx.translate(this.options.width, 0);
      this.ctx.scale(-1, 1);
    }
    this.ctx.drawImage(video, 0, 0, this.options.width, this.options.height);
    this.ctx.restore();

    // Draw keypoints
    this.drawKeypoints(keypoints);
  }

  /**
   * Draws keypoints and skeleton on the canvas
   * @param keypoints Array of [x, y, confidence] values for each keypoint
   */
  private drawKeypoints(keypoints: number[][]) {
    this.drawKeypointsAndLabels(keypoints);
    if (this.options.drawConnections) {
      this.drawSkeletonConnections(keypoints);
    }
  }

  /**
   * Draws the keypoint circles and their labels
   * @param keypoints Array of [x, y, confidence] values for each keypoint
   */
  private drawKeypointsAndLabels(keypoints: number[][]) {
    if (this.options.drawLabels) {
      this.ctx.fillStyle = this.options.format!.keypointLabelColor!;
      this.ctx.font = this.options.format!.keypointLabelFont!;
    }

    keypoints.forEach((keypoint, i) => {
      const [x, y, confidence] = keypoint;
      if (confidence > this.options.confidenceThreshold!) {
        // Draw keypoint circle
        this.ctx.beginPath();
        this.ctx.arc(
          x,
          y,
          this.options.format!.keypointRadius!,
          0,
          2 * Math.PI
        );
        this.ctx.fillStyle = this.options.format!.keypointColor!;
        this.ctx.fill();

        // Draw keypoint label if enabled
        if (this.options.drawLabels) {
          this.ctx.fillStyle = this.options.format!.keypointLabelColor!;
          const name = Object.keys(keypointNames).find(
            (key) => keypointNames[key as keyof typeof keypointNames] === i
          );
          if (name) {
            this.ctx.fillText(
              name,
              x + this.options.format!.keypointLabelOffset!,
              y
            );
          }
        }
      }
    });
  }

  /**
   * Draws the skeleton connections between keypoints
   * @param keypoints Array of [x, y, confidence] values for each keypoint
   */
  private drawSkeletonConnections(keypoints: number[][]) {
    this.ctx.strokeStyle = this.options.format!.skeletonColor!;
    this.ctx.lineWidth = this.options.format!.skeletonLineWidth!;
    keypointConnections.forEach(([i, j]) => {
      const kp1 = keypoints[i];
      const kp2 = keypoints[j];
      if (
        kp1[2] > this.options.confidenceThreshold! &&
        kp2[2] > this.options.confidenceThreshold!
      ) {
        this.ctx.beginPath();
        this.ctx.moveTo(kp1[0], kp1[1]);
        this.ctx.lineTo(kp2[0], kp2[1]);
        this.ctx.stroke();
      }
    });
  }
}
