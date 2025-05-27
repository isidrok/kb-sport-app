import { Camera, type CameraOptions } from "./camera";
import { Whiteboard, type WhiteboardOptions } from "./whiteboard";
import { YoloV8NPoseModel, type ModelOptions } from "./model";

export interface PoseTrackerOptions {
  width: number;
  height: number;
  videoElement: HTMLVideoElement;
  canvasElement: HTMLCanvasElement;
  model: ModelOptions;
  onPose?: (keypoints: number[][]) => void;
  whiteboard?: Partial<WhiteboardOptions>;
  camera?: Partial<CameraOptions>;
  flipVideo?: boolean;
}

export class PoseTracker {
  private camera: Camera;
  private whiteboard: Whiteboard;
  private model: YoloV8NPoseModel;
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;
  private options: PoseTrackerOptions;

  constructor(options: PoseTrackerOptions) {
    this.options = options;
    this.camera = new Camera(options.videoElement, {
      width: options.width,
      height: options.height,
      ...options.camera,
    });
    this.whiteboard = new Whiteboard(options.canvasElement, {
      width: options.width,
      height: options.height,
      flipVideo: options.flipVideo,
      ...options.whiteboard,
    });
    this.model = new YoloV8NPoseModel(options.model);
  }

  /**
   * Initializes the pose tracker by loading the model
   */
  async init(): Promise<void> {
    await this.model.init();
  }

  /**
   * Starts the pose tracking
   */
  async start(): Promise<void> {
    if (this.isRunning) return;

    await this.camera.start();
    this.isRunning = true;
    this.processFrame();
  }

  /**
   * Stops the pose tracking and cleans up resources
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.camera.stop();
  }

  /**
   * Disposes all resources
   */
  dispose(): void {
    this.stop();
    this.camera.dispose();
    this.whiteboard.dispose();
    this.model.dispose();
  }

  /**
   * Processes a single frame of video
   */
  private async processFrame(): Promise<void> {
    if (!this.isRunning) return;

    const video = this.camera.getVideo();
    const result = this.model.process(video);
    let keypoints: number[][] = [];

    try {
      const keypointsData = await result.keypoints.data();
      keypoints = this.processKeypoints(
        keypointsData,
        result.scale,
        result.dx,
        result.dy,
        video.videoWidth,
        video.videoHeight
      );
      this.options.onPose?.(keypoints);
      this.whiteboard.drawFrame(video, keypoints);
      this.animationFrameId = requestAnimationFrame(() => this.processFrame());
    } finally {
      // Clean up tensors
      result.box.dispose();
      result.score.dispose();
      result.keypoints.dispose();
    }
  }

  /**
   * Processes raw keypoint data into the expected format
   * @param keypointsData Raw keypoint data from model
   * @param scale Scale factor from model preprocessing (maxDim / modelWidth)
   * @param dx Horizontal padding from letterboxing
   * @param dy Vertical padding from letterboxing
   * @param origWidth Original video width
   * @param origHeight Original video height
   * @returns Array of [x, y, confidence] values for each keypoint
   */
  private processKeypoints(
    keypointsData: Float32Array | Int32Array | Uint8Array,
    scale: number,
    dx: number,
    dy: number,
    origWidth: number,
    origHeight: number
  ): number[][] {
    const { flipVideo, width } = this.options;
    const processedKeypoints = [];
    for (let i = 0; i < 17; i++) {
      // Get raw coordinates from model output
      let x = keypointsData[i * 3];
      let y = keypointsData[i * 3 + 1];

      // Scale back to the padded square image size
      x = x * scale;
      y = y * scale;

      // Remove padding
      x = x - dx;
      y = y - dy;

      // Clamp coordinates to original image bounds
      x = Math.max(0, Math.min(x, origWidth));
      y = Math.max(0, Math.min(y, origHeight));

      // Flip x coordinate for keypoints to match flipped video
      x = flipVideo ? width - x : x;

      const conf = keypointsData[i * 3 + 2];
      processedKeypoints.push([x, y, conf]);
    }
    return processedKeypoints;
  }

  /**
   * Gets the video element being used for tracking
   */
  getVideo(): HTMLVideoElement {
    return this.camera.getVideo();
  }
}
