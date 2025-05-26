import { useEffect, useRef, useState } from "preact/hooks";
import { useTracker } from "../use-tracker";
import { VideoStorage } from "../tracker/video-storage";

interface WorkoutViewProps {
  onViewChange: () => void;
  videoStorage: VideoStorage;
}

export function WorkoutView({ onViewChange, videoStorage }: WorkoutViewProps) {
  const { isRunning, stats, toggleTracker, initTracker, dispose } =
    useTracker(videoStorage);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const { width, height } =
      videoContainerRef.current?.getBoundingClientRect() ?? {
        width: 0,
        height: 0,
      };
    initTracker(width, height);
    return () => {
      dispose();
    };
  }, []);

  return (
    <div class="workout-view">
      <div class="video-container" ref={videoContainerRef}>
        <video
          id="video"
          playsinline
          autoplay
          muted
          width="100%"
          height="100%"
        ></video>
        <canvas id="canvas" width="100%" height="100%"></canvas>
      </div>
      <div class="controls">
        <div class="counter">
          {stats.totalReps} @ {stats.rpm} RPM
        </div>
        <div className="button-group">
          <button onClick={toggleTracker}>
            {isRunning ? "Stop" : "Start"}
          </button>
          <button
            onClick={onViewChange}
            class="view-switch"
            disabled={isRunning}
          >
            View Recordings
          </button>
        </div>
      </div>
    </div>
  );
}
