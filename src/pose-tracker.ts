import { Camera, type CameraOptions } from "./video";
import { Whiteboard, type WhiteboardOptions } from "./whiteboard";
import { YoloV8NPoseModel, type ModelOptions } from "./model";

export interface PoseTrackerOptions {
  width: number;
  height: number;
  videoElement: HTMLVideoElement;
  canvasElement: HTMLCanvasElement;
  model: ModelOptions;
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
      keypoints = this.processKeypoints(keypointsData);
    } finally {
      // Clean up tensors
      result.box.dispose();
      result.score.dispose();
      result.keypoints.dispose();
    }

    this.whiteboard.drawFrame(video, keypoints);
    this.animationFrameId = requestAnimationFrame(() => this.processFrame());
  }

  /**
   * Processes raw keypoint data into the expected format
   * @param keypointsData Raw keypoint data from model
   * @returns Array of [x, y, confidence] values for each keypoint
   */
  private processKeypoints(
    keypointsData: Float32Array | Int32Array | Uint8Array
  ): number[][] {
    const { flipVideo, width } = this.options;
    const processedKeypoints = [];
    for (let i = 0; i < 17; i++) {
      // Flip x coordinate for keypoints to match flipped video
      const x = flipVideo ? width - keypointsData[i * 3] : keypointsData[i * 3];
      const y = keypointsData[i * 3 + 1];
      const conf = keypointsData[i * 3 + 2];
      processedKeypoints.push([x, y, conf]);
    }
    return processedKeypoints;
  }
}
