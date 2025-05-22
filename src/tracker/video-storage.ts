import type { RepRecord } from "./rep-tracker";

export interface RepData {
  timestamp: number;
  repCount: number;
}

export interface RecordingMetadata {
  id: string;
  timestamp: number;
  duration: number;
  repCount: number;
  averageRPM: number;
  repHistory: RepRecord[];
}

export class VideoStorage {
  private root: FileSystemDirectoryHandle | null = null;
  private recordingsDir: FileSystemDirectoryHandle | null = null;

  constructor() {
    this.init();
  }

  private async init() {
    try {
      this.root = await navigator.storage.getDirectory();
      this.recordingsDir = await this.root.getDirectoryHandle("recordings", {
        create: true,
      });
    } catch (error) {
      throw new Error("Failed to initialize video storage");
    }
  }

  /**
   * Starts recording a new session
   * @returns A MediaRecorder instance that can be used to record the session
   */
  async startRecording(
    stream: MediaStream,
    timestamp: number
  ): Promise<MediaRecorder> {
    if (!this.recordingsDir) {
      throw new Error("Video storage not initialized");
    }

    const id = `recording_${timestamp}`;
    const fileHandle = await this.recordingsDir.getFileHandle(`${id}.webm`, {
      create: true,
    });
    const writable = await fileHandle.createWritable();

    const recorder = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=vp9",
      videoBitsPerSecond: 2500000, // 2.5 Mbps
    });

    recorder.ondataavailable = async (event) => {
      if (event.data.size > 0) {
        await writable.write(event.data);
      }
    };

    recorder.onstop = async () => {
      await writable.close();
    };

    return recorder;
  }

  /**
   * Saves metadata for a recording session
   */
  async saveMetadata(metadata: RecordingMetadata): Promise<void> {
    if (!this.recordingsDir) {
      throw new Error("Video storage not initialized");
    }

    const fileHandle = await this.recordingsDir.getFileHandle(
      `metadata_${metadata.id}.json`,
      { create: true }
    );
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(metadata));
    await writable.close();
  }

  /**
   * Lists all available recordings with their metadata
   */
  async listRecordings(): Promise<RecordingMetadata[]> {
    if (!this.recordingsDir) {
      throw new Error("Video storage not initialized");
    }

    const recordings: RecordingMetadata[] = [];

    try {
      for await (const entry of this.recordingsDir.values()) {
        if (
          entry.name.startsWith("metadata_") &&
          entry.name.endsWith(".json")
        ) {
          const fileHandle = await this.recordingsDir.getFileHandle(entry.name);
          const file = await fileHandle.getFile();
          const text = await file.text();
          const metadata = JSON.parse(text) as RecordingMetadata;

          const videoFileName = `${metadata.id}.webm`;
          try {
            const videoHandle = await this.recordingsDir.getFileHandle(
              videoFileName
            );
            const videoFile = await videoHandle.getFile();
            recordings.push(metadata);
          } catch (error) {
            // Skip recordings without video files
          }
        }
      }
    } catch (error) {
      throw new Error("Error listing recordings");
    }

    return recordings.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Gets a recording by its ID
   */
  async getRecording(id: string): Promise<Blob> {
    if (!this.recordingsDir) {
      throw new Error("Video storage not initialized");
    }

    try {
      const fileHandle = await this.recordingsDir.getFileHandle(`${id}.webm`);
      const file = await fileHandle.getFile();
      return file;
    } catch (error) {
      throw new Error("Error getting recording");
    }
  }

  /**
   * Deletes a recording and its metadata
   */
  async deleteRecording(id: string): Promise<void> {
    if (!this.recordingsDir) {
      throw new Error("Video storage not initialized");
    }

    try {
      await this.recordingsDir.removeEntry(`${id}.webm`);
      await this.recordingsDir.removeEntry(`metadata_${id}.json`);
    } catch (error) {
      throw new Error(`Failed to delete recording ${id}`);
    }
  }
}
