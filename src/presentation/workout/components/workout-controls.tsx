import { RefObject } from "preact";
import { useState } from "preact/hooks";
import { useWorkoutState } from "../hooks/use-workout-state";
import { useWorkoutActions } from "../hooks/use-workout-actions";
import { SessionState } from "@/domain/events/session-events";
import { WorkoutButton } from "./workout-button";
import { PreviewButton } from "./preview-button";
import { WorkoutHistoryButton } from "../../workout-history/components/workout-history-button";
import { WorkoutHistoryDrawer } from "../../workout-history/components/workout-history-drawer";
import styles from "./workout-controls.module.css";

interface WorkoutControlsProps {
  videoRef: RefObject<HTMLVideoElement>;
  canvasRef: RefObject<HTMLCanvasElement>;
}

export function WorkoutControls({ videoRef, canvasRef }: WorkoutControlsProps) {
  const { sessionState, countdown } = useWorkoutState();
  const {
    startPreview,
    stopPreview,
    startWorkout,
    stopWorkout,
    reset,
    isStarting,
  } = useWorkoutActions();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const isIdle = sessionState === SessionState.Idle;
  const isPoseDetecting = sessionState === SessionState.PoseDetecting;
  const isCountingDown = sessionState === SessionState.StartCountdown;
  const isRunning = sessionState === SessionState.Running;
  const isFinished = sessionState === SessionState.Finished;

  const canStartWorkout = isPoseDetecting;
  const canStopWorkout = isRunning;

  const handleStartPreview = async () => {
    if (videoRef.current && canvasRef.current) {
      await startPreview(videoRef.current, canvasRef.current);
    }
  };

  const handleStopPreview = () => {
    stopPreview();
  };

  const handleStartWorkout = async () => {
    await startWorkout();
  };

  const handleStopWorkout = () => {
    stopWorkout();
  };

  const handleReset = () => {
    reset();
  };

  const handleOpenHistory = () => {
    setIsHistoryOpen(true);
  };

  const handleCloseHistory = () => {
    setIsHistoryOpen(false);
  };

  return (
    <>
      <div className={styles.container}>
        {isCountingDown && countdown && (
          <div className={styles.countdownOverlay}>
            <div className={styles.countdownNumber}>{countdown}</div>
          </div>
        )}

        {(isIdle || isPoseDetecting) && (
          <PreviewButton
            isPreviewActive={isPoseDetecting}
            isDisabled={false}
            onStartPreview={handleStartPreview}
            onStopPreview={handleStopPreview}
          />
        )}

        {!isFinished && (
          <WorkoutButton
            canStart={canStartWorkout}
            canStop={canStopWorkout}
            isStarting={isStarting || isCountingDown}
            onStartWorkout={handleStartWorkout}
            onStopWorkout={handleStopWorkout}
          />
        )}

        {isFinished && (
          <button className={styles.resetButton} onClick={handleReset}>
            New Workout
          </button>
        )}

        <WorkoutHistoryButton onClick={handleOpenHistory} />
      </div>
      <WorkoutHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={handleCloseHistory}
      />
    </>
  );
}
