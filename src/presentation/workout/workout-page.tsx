import { useRef } from "preact/hooks";
import styles from "./workout-page.module.css";
import { WorkoutControls } from "./components/workout-controls";
import { WorkoutStats } from "./components/workout-stats";
import { StatusPopup } from "../components/status-popup";
import { useModelLoading } from "../hooks/use-model-loading";

/**
 * Main workout page with camera feed, pose detection, and real-time statistics.
 * Provides complete training interface with glass styling.
 */
export function WorkoutPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { status, message } = useModelLoading();

  const showStatusPopup = status === "loading" || status === "error";

  return (
    <div className={styles.workoutPage}>
      <div className={styles.videoContainer}>
        <video
          ref={videoRef}
          className={styles.video}
          playsInline
          autoPlay
          muted
        />
        <canvas ref={canvasRef} className={styles.canvas} />
      </div>

      <WorkoutControls videoRef={videoRef} canvasRef={canvasRef} />

      <WorkoutStats />

      <StatusPopup
        visible={showStatusPopup}
        icon={status === "error" ? "error" : "hourglass_empty"}
        message={message}
      />
    </div>
  );
}
