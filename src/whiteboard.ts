import { keypointNames, keypointConnections } from "./keypoints";

export interface WhiteboardOptions {
  keypointRadius?: number;
  keypointLabelOffset?: number;
  keypointLabelFont?: string;
  skeletonLineWidth?: number;
  confidenceThreshold?: number;
  colors?: {
    keypoint?: string;
    keypointLabel?: string;
    skeleton?: string;
  };
}

const DEFAULT_WHITEBOARD_OPTIONS: WhiteboardOptions = {
  keypointRadius: 5,
  keypointLabelOffset: 10,
  keypointLabelFont: "12px Arial",
  skeletonLineWidth: 2,
  confidenceThreshold: 0.3,
  colors: {
    keypoint: "red",
    keypointLabel: "white",
    skeleton: "blue",
  },
};

export class Whiteboard {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private options: WhiteboardOptions;

  constructor(canvas: HTMLCanvasElement, options: WhiteboardOptions = {}) {
    this.ctx = canvas.getContext("2d")!;
    this.width = canvas.width;
    this.height = canvas.height;
    this.options = { ...DEFAULT_WHITEBOARD_OPTIONS, ...options };
  }

  /**
   * Clears the canvas
   */
  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  /**
   * Draws the video frame and pose detection results on the canvas
   * @param video The video element to draw
   * @param keypointsData Raw keypoint data from model
   */
  drawFrame(
    video: HTMLVideoElement,
    keypointsData: Float32Array | Int32Array | Uint8Array
  ) {
    // Clear canvas
    this.clear();

    // Draw flipped video
    this.ctx.save();
    this.ctx.translate(this.width, 0);
    this.ctx.scale(-1, 1);
    this.ctx.drawImage(video, 0, 0, this.width, this.height);
    this.ctx.restore();

    // Process and draw keypoints
    const processedKeypoints = this.processKeypoints(keypointsData);
    this.drawKeypoints(processedKeypoints);
  }

  /**
   * Processes raw keypoint data and flips x coordinates to match flipped video
   * @param keypointsData Raw keypoint data from model
   * @returns Array of [x, y, confidence] values for each keypoint
   */
  private processKeypoints(
    keypointsData: Float32Array | Int32Array | Uint8Array
  ): number[][] {
    const processedKeypoints = [];
    for (let i = 0; i < 17; i++) {
      // Flip x coordinate for keypoints to match flipped video
      const x = this.width - keypointsData[i * 3];
      const y = keypointsData[i * 3 + 1];
      const conf = keypointsData[i * 3 + 2];
      processedKeypoints.push([x, y, conf]);
    }
    return processedKeypoints;
  }

  /**
   * Draws keypoints and skeleton on the canvas
   * @param keypoints Array of [x, y, confidence] values for each keypoint
   */
  private drawKeypoints(keypoints: number[][]) {
    // Draw keypoints
    keypoints.forEach((keypoint, i) => {
      const [x, y, confidence] = keypoint;
      if (confidence > this.options.confidenceThreshold!) {
        // Draw keypoint circle
        this.ctx.beginPath();
        this.ctx.arc(x, y, this.options.keypointRadius!, 0, 2 * Math.PI);
        this.ctx.fillStyle = this.options.colors!.keypoint!;
        this.ctx.fill();

        // Draw keypoint label
        this.ctx.fillStyle = this.options.colors!.keypointLabel!;
        this.ctx.font = this.options.keypointLabelFont!;
        const name = Object.keys(keypointNames).find(
          (key) => keypointNames[key as keyof typeof keypointNames] === i
        );
        if (name) {
          this.ctx.fillText(name, x + this.options.keypointLabelOffset!, y);
        }
      }
    });

    // Draw skeleton connections
    this.ctx.strokeStyle = this.options.colors!.skeleton!;
    this.ctx.lineWidth = this.options.skeletonLineWidth!;
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
