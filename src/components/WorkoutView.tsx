import { useEffect } from "preact/hooks";
import { useTracker } from "../use-tracker";
import { VideoStorage } from "../tracker/video-storage";

interface WorkoutViewProps {
  onViewChange: () => void;
  videoStorage: VideoStorage;
}

const VIDEO_WIDTH = 480;
const VIDEO_HEIGHT = 640;

export function WorkoutView({ onViewChange, videoStorage }: WorkoutViewProps) {
  const { isRunning, stats, toggleTracker, initTracker, dispose } =
    useTracker(videoStorage);

  useEffect(() => {
    // Set CSS variables
    document.documentElement.style.setProperty(
      "--video-width",
      `${VIDEO_WIDTH}px`
    );
    document.documentElement.style.setProperty(
      "--video-height",
      `${VIDEO_HEIGHT}px`
    );

    initTracker(VIDEO_WIDTH, VIDEO_HEIGHT);
    return dispose;
  }, []);

  return (
    <div class="workout-view">
      <div class="video-container">
        <video
          id="video"
          playsinline
          autoplay
          muted
          width={VIDEO_WIDTH}
          height={VIDEO_HEIGHT}
        ></video>
        <canvas id="canvas" width={VIDEO_WIDTH} height={VIDEO_HEIGHT}></canvas>
      </div>
      <div class="controls">
        <div class="counter">
          {stats.totalReps}
          <span>{stats.rpm} RPM</span>
        </div>
        <button onClick={toggleTracker}>{isRunning ? "Stop" : "Start"}</button>
        <button onClick={onViewChange} class="view-switch" disabled={isRunning}>
          View Recordings
        </button>
      </div>
    </div>
  );
}
