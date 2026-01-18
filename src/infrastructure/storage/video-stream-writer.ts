export interface VideoSettings {
  type: string;
  bitrate: number;
}

export class VideoStreamWriter {
  private mediaRecorder: MediaRecorder | null = null;
  private fileWriter: FileSystemWritableFileStream | null = null;
  private totalSize = 0;

  async startRecording(
    mediaStream: MediaStream,
    fileWriter: FileSystemWritableFileStream,
    settings: VideoSettings,
  ): Promise<void> {
    this.totalSize = 0;
    this.fileWriter = fileWriter;

    this.mediaRecorder = new MediaRecorder(mediaStream, {
      mimeType: settings.type,
      videoBitsPerSecond: settings.bitrate,
    });

    this.mediaRecorder.ondataavailable = async (event) => {
      if (event.data && event.data.size > 0 && this.fileWriter) {
        await this.fileWriter.write(event.data);
        this.totalSize += event.data.size;
      }
    };

    this.mediaRecorder.start();
  }

  async stopRecording(): Promise<{ sizeInBytes: number }> {
    if (!this.mediaRecorder) {
      throw new Error(
        "MediaRecorder is not initialized. Call startRecording first.",
      );
    }
    return new Promise((resolve) => {
      this.mediaRecorder!.onstop = async () => {
        if (this.fileWriter) {
          await this.fileWriter.close();
          this.fileWriter = null;
        }
        resolve({ sizeInBytes: this.totalSize });
      };
      this.mediaRecorder!.stop();
    });
  }
}

export const videoStreamWriter = new VideoStreamWriter();
