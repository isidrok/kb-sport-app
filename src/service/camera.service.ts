const CAMERA_CONFIG = {
  FACING_MODE: 'user',
  TIMEOUT_MS: 10000,
} as const;

export class CameraService {
  private stream: MediaStream | null = null;

  async start(width: number, height: number, videoElement: HTMLVideoElement): Promise<void> {
    const { finalWidth, finalHeight } = this.getOptimalDimensions(width, height);

    try {
      this.stream = await this.requestCameraAccess(finalWidth, finalHeight);
      await this.setupVideoElement(videoElement);
    } catch (error) {
      this.cleanup();
      throw new Error(`Failed to start camera: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  stop(): void {
    this.cleanup();
  }

  private getOptimalDimensions(width: number, height: number): { finalWidth: number; finalHeight: number } {
    // Check if device is in portrait mode and flip dimensions for better camera quality
    const isPortrait = window.innerHeight > window.innerWidth;
    return {
      finalWidth: isPortrait ? height : width,
      finalHeight: isPortrait ? width : height,
    };
  }

  private async requestCameraAccess(width: number, height: number): Promise<MediaStream> {
    return navigator.mediaDevices.getUserMedia({
      video: {
        width,
        height,
        facingMode: CAMERA_CONFIG.FACING_MODE,
      },
      audio: false,
    });
  }

  private async setupVideoElement(videoElement: HTMLVideoElement): Promise<void> {
    if (!this.stream) {
      throw new Error('No camera stream available');
    }

    videoElement.srcObject = this.stream;

    // Return promise that resolves when video is ready
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Video loading timed out'));
      }, CAMERA_CONFIG.TIMEOUT_MS);

      videoElement.onloadedmetadata = () => {
        clearTimeout(timeoutId);
        resolve();
      };

      videoElement.onerror = () => {
        clearTimeout(timeoutId);
        reject(new Error('Failed to load video'));
      };
    });
  }

  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }
}