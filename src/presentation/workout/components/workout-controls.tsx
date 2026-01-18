import { RefObject } from "preact";
import { useState } from "preact/hooks";
import { useWorkoutState } from "../hooks/use-workout-state";
import { useWorkoutActions } from "../hooks/use-workout-actions";
import { SessionState } from "@/domain/events/session-events";
import { WorkoutButton } from "./workout-button";
import { PreviewButton } from "./preview-button";
import { WorkoutHistoryButton } from "../../workout-history/components/workout-history-button";
import { WorkoutHistoryDrawer } from "../../workout-history/components/workout-history-drawer";
import { StatusPopup } from "../../components/status-popup";
import styles from "./workout-controls.module.css";

interface WorkoutControlsProps {
  videoRef: RefObject<HTMLVideoElement>;
  canvasRef: RefObject<HTMLCanvasElement>;
}

export function WorkoutControls({ videoRef, canvasRef }: WorkoutControlsProps) {
  const { sessionState, countdown } = useWorkoutState();
  const { startPreview, stopPreview, startWorkout, stopWorkout, isStarting } =
    useWorkoutActions();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const isIdle = sessionState === SessionState.Idle;
  const isPoseDetecting = sessionState === SessionState.PoseDetecting;
  const isCountingDown = sessionState === SessionState.StartCountdown;
  const isRunning = sessionState === SessionState.Running;
  const isFinished = sessionState === SessionState.Finished;

  // Can start workout from Idle, PoseDetecting, or Finished
  const canStartWorkout = isIdle || isPoseDetecting || isFinished;

  // Can stop workout only when Running
  const canStopWorkout = isRunning;

  // Preview and History available when NOT in active workout (countdown or running)
  const isInActiveWorkout = isCountingDown || isRunning;
  const canUsePreviewAndHistory = !isInActiveWorkout;

  const handleStartPreview = async () => {
    if (videoRef.current && canvasRef.current) {
      await startPreview(videoRef.current, canvasRef.current);
    }
  };

  const handleStopPreview = () => {
    stopPreview();
  };

  const handleStartWorkout = async () => {
    if (videoRef.current && canvasRef.current) {
      await startWorkout(videoRef.current, canvasRef.current);
    }
  };

  const handleStopWorkout = () => {
    stopWorkout();
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
        <PreviewButton
          isPreviewActive={isPoseDetecting}
          isDisabled={!canUsePreviewAndHistory}
          onStartPreview={handleStartPreview}
          onStopPreview={handleStopPreview}
        />
        <WorkoutButton
          canStart={canStartWorkout}
          canStop={canStopWorkout}
          isStarting={isStarting || isCountingDown}
          onStartWorkout={handleStartWorkout}
          onStopWorkout={handleStopWorkout}
        />
        <WorkoutHistoryButton
          onClick={handleOpenHistory}
          isDisabled={!canUsePreviewAndHistory}
        />
      </div>
      <StatusPopup
        visible={isCountingDown && countdown !== undefined}
        icon="timer"
        message={countdown?.toString()}
      />
      <WorkoutHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={handleCloseHistory}
      />
    </>
  );
}
