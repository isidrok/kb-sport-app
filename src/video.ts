import { deepMerge } from "./utils";

export interface CameraOptions {
  width: number;
  height: number;
  facingMode?: "user" | "environment";
  audio?: boolean;
}

const DEFAULT_CAMERA_OPTIONS: Partial<CameraOptions> = {
  facingMode: "user",
  audio: false,
};

export class Camera {
  private video: HTMLVideoElement;
  private options: CameraOptions;
  private stream: MediaStream | null = null;

  constructor(video: HTMLVideoElement, options: CameraOptions) {
    if (!options.width || !options.height) {
      throw new Error("width and height are required");
    }
    this.video = video;
    this.options = deepMerge(options, DEFAULT_CAMERA_OPTIONS);
  }

  /**
   * Starts capturing video from the user's camera
   * @returns Promise that resolves when the video is ready
   */
  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: this.options.audio,
      video: {
        width: this.options.width,
        height: this.options.height,
        facingMode: this.options.facingMode,
      },
    });
    this.video.srcObject = this.stream;

    return new Promise((resolve) => {
      this.video.addEventListener(
        "loadeddata",
        () => {
          setTimeout(resolve, 100);
        },
        { once: true }
      );
    });
  }

  /**
   * Stops capturing video and cleans up resources
   */
  stop(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.video.srcObject = null;
  }

  /**
   * Gets the current video element
   */
  getVideo(): HTMLVideoElement {
    return this.video;
  }
}
