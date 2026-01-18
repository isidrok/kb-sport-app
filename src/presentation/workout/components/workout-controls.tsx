import { RefObject } from "preact";
import { useState } from "preact/hooks";
import { useWorkoutState } from "../hooks/use-workout-state";
import { useWorkoutActions } from "../hooks/use-workout-actions";
import { SessionState } from "@/domain/events/session-events";
import { WorkoutButton } from "./workout-button";
import { PreviewButton } from "./preview-button";
import { WorkoutHistoryButton } from "../../workout-history/components/workout-history-button";
import { WorkoutHistoryDrawer } from "../../workout-history/components/workout-history-drawer";
import { SettingsButton } from "../../settings/components/settings-button";
import { SettingsDrawer } from "../../settings/components/settings-drawer";
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const isIdle = sessionState === SessionState.Idle;
  const isPoseDetecting = sessionState === SessionState.PoseDetecting;
  const isStartCountdown = sessionState === SessionState.StartCountdown;
  const isRunning = sessionState === SessionState.Running;
  const isStopCountdown = sessionState === SessionState.StopCountdown;
  const isFinished = sessionState === SessionState.Finished;

  // Can start workout from Idle, PoseDetecting, or Finished
  const canStartWorkout = isIdle || isPoseDetecting || isFinished;

  // Can stop workout when Running or during StopCountdown
  const canStopWorkout = isRunning || isStopCountdown;

  // Preview and History available when NOT in active workout (countdown or running)
  const isInActiveWorkout = isStartCountdown || isRunning || isStopCountdown;
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

  const handleOpenSettings = () => {
    setIsSettingsOpen(true);
  };

  const handleCloseSettings = () => {
    setIsSettingsOpen(false);
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
          isStarting={isStarting || isStartCountdown}
          onStartWorkout={handleStartWorkout}
          onStopWorkout={handleStopWorkout}
        />
        <WorkoutHistoryButton
          onClick={handleOpenHistory}
          isDisabled={!canUsePreviewAndHistory}
        />
        <SettingsButton
          onClick={handleOpenSettings}
          isDisabled={!canUsePreviewAndHistory}
        />
      </div>
      <StatusPopup
        visible={isStartCountdown && countdown !== undefined}
        icon="timer"
        message={`Starting in ${countdown}`}
        kind="info"
      />
      <StatusPopup
        visible={isStopCountdown && countdown !== undefined}
        icon="timer"
        message={`Stopping in ${countdown}`}
        kind="info"
      />
      <WorkoutHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={handleCloseHistory}
      />
      <SettingsDrawer isOpen={isSettingsOpen} onClose={handleCloseSettings} />
    </>
  );
}
