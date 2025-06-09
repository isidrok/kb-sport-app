import { useWorkout } from "../hooks/use-workout";
import { WorkoutMetrics } from "./workout-metrics";
import { WorkoutStatus } from "./workout-status";
import { WorkoutControls } from "./workout-controls";
import styles from "./workout-page.module.css";

export function WorkoutPage() {
  const {
    videoRef,
    canvasRef,
    isSessionActive,
    currentSession,
    countdown,
    sessionEndCountdown,
    error,
    isModelLoading,
    settings,
    startSession,
    stopSession,
    updateSettings,
  } = useWorkout();

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

      <WorkoutMetrics currentSession={currentSession} />

      <div className={styles.controls}>
        <WorkoutStatus
          isModelLoading={isModelLoading}
          error={error}
          countdown={countdown}
          sessionEndCountdown={sessionEndCountdown}
        />

        <WorkoutControls
          isSessionActive={isSessionActive}
          isModelLoading={isModelLoading}
          countdown={countdown}
          error={error}
          settings={settings}
          startSession={startSession}
          stopSession={stopSession}
          updateSettings={updateSettings}
        />
      </div>
    </div>
  );
}
