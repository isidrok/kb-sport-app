import { useRef } from "preact/hooks";
import styles from "./workout-page.module.css";
import { WorkoutControls } from "./components/workout-controls";
import { WorkoutStats } from "./components/workout-stats";
import { InfoButton } from "../components/info-button";

/**
 * Main workout page with camera feed, pose detection, and real-time statistics.
 * Provides complete training interface with glass styling.
 */
export function WorkoutPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  return (
    <div className={styles.workoutPage}>
      <InfoButton />
      
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
    </div>
  );
}
