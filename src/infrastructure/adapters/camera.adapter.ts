export class CameraAdapter {
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;

  async start(videoElement: HTMLVideoElement): Promise<void> {
    if (this.stream) {
      throw new Error("Camera already started");
    }

    const targetWidth = videoElement.width;
    const targetHeight = videoElement.height;
    const { finalWidth, finalHeight } = this.getOptimalDimensions(
      targetWidth,
      targetHeight,
    );

    this.stream = await this.requestCameraAccess(finalWidth, finalHeight);

    this.videoElement = videoElement;
    await this.setupVideoElement();
  }

  stop(): void {
    this.cleanup();
  }

  getStream(): MediaStream | null {
    return this.stream;
  }

  isActive(): boolean {
    return this.stream !== null && this.stream.active;
  }

  private getOptimalDimensions(
    width: number,
    height: number,
  ): { finalWidth: number; finalHeight: number } {
    const isPortrait = window.innerHeight > window.innerWidth;
    return {
      finalWidth: isPortrait ? height : width,
      finalHeight: isPortrait ? width : height,
    };
  }

  private async requestCameraAccess(
    width: number,
    height: number,
  ): Promise<MediaStream> {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: {
          width,
          height,
          facingMode: "user",
        },
        audio: false,
      });
    } catch (error) {
      console.error("Failed to access camera:", error);
      throw new Error("Camera access denied or not available");
    }
  }

  private async setupVideoElement(): Promise<void> {
    if (!this.stream || !this.videoElement) {
      throw new Error("Stream or video element not available");
    }

    this.videoElement.srcObject = this.stream;
    this.videoElement.muted = true;
    this.videoElement.playsInline = true;

    // Wait for video to be ready
    await new Promise<void>((resolve, reject) => {
      if (!this.videoElement) {
        reject(new Error("Video element not available"));
        return;
      }

      this.videoElement.onloadedmetadata = () => {
        this.videoElement!.play()
          .then(() => resolve())
          .catch(reject);
      };

      this.videoElement.onerror = () => {
        reject(new Error("Failed to load video"));
      };
    });
  }

  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }
  }
}

// Export singleton instance
export const cameraAdapter = new CameraAdapter();
