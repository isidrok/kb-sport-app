import { useState } from "preact/hooks";
import { PoseTracker } from "../tracker/pose-tracker";
import { RepTracker } from "../tracker/rep-tracker";
import { VideoStorage, type RecordingMetadata } from "../tracker/video-storage";

interface TrackerStats {
  totalReps: number;
  rpm: number;
}

export function useTracker(videoStorage: VideoStorage) {
  const [tracker, setTracker] = useState<PoseTracker | null>(null);
  const [repTracker, setRepTracker] = useState<RepTracker | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState<TrackerStats>({ totalReps: 0, rpm: 0 });
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);

  const initTracker = async (width: number, height: number) => {
    const video = document.getElementById("video") as HTMLVideoElement;
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;

    if (!video || !canvas) return;
    canvas.width = width;
    canvas.height = height;
    const newRepTracker = new RepTracker();
    const newTracker = new PoseTracker({
      width,
      height,
      videoElement: video,
      canvasElement: canvas,
      model: {
        modelURL: "models/yolov8n-pose_web_model/model.json",
        onProgress: () => {},
      },
      flipVideo: true,
      onPose: (keypoints) => {
        const newStats = newRepTracker.detect(keypoints);
        if (newStats) {
          setStats(newStats);
        }
      },
    });

    await newTracker.init();
    setTracker(newTracker);
    setRepTracker(newRepTracker);
  };

  const toggleTracker = async () => {
    if (!tracker) return;

    if (!isRunning) {
      try {
        await tracker.start();
        const stream = tracker.getVideo().srcObject as MediaStream;
        if (stream) {
          const sessionStartTime = Date.now();
          const newRecorder = await videoStorage.startRecording(
            stream,
            sessionStartTime
          );
          setRecorder(newRecorder);
          newRecorder.start(1000);
          setSessionStartTime(sessionStartTime);
          setIsRunning(true);
        } else {
          tracker.stop();
        }
      } catch (error) {
        tracker.stop();
      }
    } else {
      if (recorder) {
        recorder.stop();
        const duration = Date.now() - sessionStartTime;
        const metadata: RecordingMetadata = {
          id: `recording_${sessionStartTime}`,
          timestamp: sessionStartTime,
          duration,
          repCount: stats.totalReps,
          averageRPM: stats.rpm,
          repHistory: repTracker?.getRepHistory() || [],
        };
        await videoStorage.saveMetadata(metadata);
        setRecorder(null);
      }
      tracker.stop();
      repTracker?.reset();
      setStats({ totalReps: 0, rpm: 0 });
      setIsRunning(false);
    }
  };

  const dispose = () => {
    if (recorder) {
      recorder.stop();
    }
    tracker?.dispose();
  };

  return {
    isRunning,
    stats,
    toggleTracker,
    initTracker,
    dispose,
  };
}
