export interface RecordingSession {
  workoutId: string;
  mediaRecorder: MediaRecorder;
  videoWriter: FileSystemWritableFileStream;
  videoSize: number;
}

export interface RecordingResult {
  workoutId: string;
  videoSize: number;
}

/**
 * Pure recording service responsible for managing MediaRecorder
 * and writing video data to FileSystem streams
 */
export class RecordingService {
  private activeRecording: RecordingSession | null = null;

  async startRecording(
    workoutId: string,
    stream: MediaStream,
    videoWriter: FileSystemWritableFileStream
  ): Promise<void> {
    if (this.activeRecording) {
      throw new Error("Recording already in progress");
    }

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=vp9",
    });

    this.activeRecording = {
      workoutId,
      mediaRecorder,
      videoWriter,
      videoSize: 0,
    };

    mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0 && this.activeRecording) {
        this.activeRecording.videoSize += event.data.size;
        await videoWriter.write(event.data);
      }
    };

    mediaRecorder.start(1000);
  }

  async stopRecording(): Promise<RecordingResult> {
    if (!this.activeRecording) {
      throw new Error("No active recording");
    }

    const { workoutId, mediaRecorder, videoWriter, videoSize } =
      this.activeRecording;

    return new Promise((resolve, reject) => {
      mediaRecorder.onstop = async () => {
        try {
          await videoWriter.close();
          this.activeRecording = null;
          resolve({ workoutId, videoSize });
        } catch (error) {
          reject(error);
        }
      };

      mediaRecorder.stop();
    });
  }

  isRecording(): boolean {
    return this.activeRecording !== null;
  }

  getCurrentRecordingId(): string | null {
    return this.activeRecording?.workoutId || null;
  }

  getRecordingSize(): number {
    return this.activeRecording?.videoSize || 0;
  }

  dispose(): void {
    if (this.activeRecording) {
      this.activeRecording.mediaRecorder.stop();
      this.activeRecording = null;
    }
  }
}