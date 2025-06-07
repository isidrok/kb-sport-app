export class CameraService {
  private stream: MediaStream | null = null;

  async start(width: number, height: number, videoElement: HTMLVideoElement): Promise<void> {
    // Check if device is in portrait mode and flip dimensions
    const isPortrait = window.innerHeight > window.innerWidth;
    const finalWidth = isPortrait ? height : width;
    const finalHeight = isPortrait ? width : height;

    // Get user camera without audio
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: finalWidth,
        height: finalHeight,
        facingMode: 'user'
      },
      audio: false
    });

    // Set video source
    videoElement.srcObject = this.stream;

    // Return promise that resolves when video starts
    return new Promise((resolve) => {
      videoElement.onloadedmetadata = () => {
        resolve();
      };
    });
  }

  stop(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }
}