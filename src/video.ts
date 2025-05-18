export class VideoHandler {
  private video: HTMLVideoElement;
  private width: number;
  private height: number;
  private stream: MediaStream | null = null;

  constructor(
    video: HTMLVideoElement,
    width: number = 640,
    height: number = 640
  ) {
    this.video = video;
    this.width = width;
    this.height = height;
  }

  /**
   * Starts capturing video from the user's camera
   * @returns Promise that resolves when the video is ready
   */
  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { width: this.width, height: this.height, facingMode: "user" },
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

  /**
   * Gets the current video dimensions
   */
  getDimensions(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }
}
