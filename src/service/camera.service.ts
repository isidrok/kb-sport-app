export class CameraService {
  private stream: MediaStream | null = null;

  async start(
    width: number,
    height: number,
    videoElement: HTMLVideoElement
  ): Promise<void> {
    const { finalWidth, finalHeight } = this.getOptimalDimensions(
      width,
      height
    );

    this.stream = await this.requestCameraAccess(finalWidth, finalHeight);
    await this.setupVideoElement(videoElement);
  }

  stop(): void {
    this.cleanup();
  }

  private getOptimalDimensions(
    width: number,
    height: number
  ): { finalWidth: number; finalHeight: number } {
    const isPortrait = window.innerHeight > window.innerWidth;
    return {
      finalWidth: isPortrait ? height : width,
      finalHeight: isPortrait ? width : height,
    };
  }

  private async requestCameraAccess(
    width: number,
    height: number
  ): Promise<MediaStream> {
    return navigator.mediaDevices.getUserMedia({
      video: {
        width,
        height,
        facingMode: "user",
      },
      audio: false,
    });
  }

  private async setupVideoElement(
    videoElement: HTMLVideoElement
  ): Promise<void> {
    if (!this.stream) {
      throw new Error("No camera stream available");
    }

    videoElement.srcObject = this.stream;

    // Return promise that resolves when video is ready
    return new Promise((resolve, reject) => {
      videoElement.onloadedmetadata = () => {
        resolve();
      };

      videoElement.onerror = () => {
        reject(new Error("Failed to load video"));
      };
    });
  }

  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }
}
