import { WorkoutSettingsMenu } from "./workout-settings";
import { WorkoutSettings } from "../../../shared/types/workout-types";
import styles from "./workout-controls.module.css";

interface WorkoutControlsProps {
  isSessionActive: boolean;
  isModelLoading: boolean;
  countdown: number | null;
  error: string | null;
  settings: WorkoutSettings | null;
  startSession: () => void;
  stopSession: () => void;
  updateSettings: (settings: WorkoutSettings) => void;
}

interface SessionButtonProps {
  isSessionActive: boolean;
  isModelLoading: boolean;
  countdown: number | null;
  error: string | null;
  settings: WorkoutSettings | null;
  onStart: () => void;
  onStop: () => void;
}

function SessionButton({
  isSessionActive,
  isModelLoading,
  countdown,
  error,
  settings,
  onStart,
  onStop,
}: SessionButtonProps) {
  const isDisabled = 
    isModelLoading || 
    countdown !== null || 
    error !== null || 
    !settings;

  const getButtonIcon = () => {
    if (isModelLoading) return "🧠";
    if (error) return "❌";
    if (countdown !== null) return "⏳";
    if (isSessionActive) return "⏹️";
    return "▶️";
  };

  const getButtonClass = () => {
    const baseClass = styles.sessionButton;
    if (isSessionActive) return `${baseClass} ${styles.stop}`;
    return `${baseClass} ${styles.start}`;
  };

  return (
    <button
      className={getButtonClass()}
      onClick={isSessionActive ? onStop : onStart}
      disabled={isDisabled}
    >
      {getButtonIcon()}
    </button>
  );
}

export function WorkoutControls({
  isSessionActive,
  isModelLoading,
  countdown,
  error,
  settings,
  startSession,
  stopSession,
  updateSettings,
}: WorkoutControlsProps) {
  return (
    <div className={styles.buttonRow}>
      <SessionButton
        isSessionActive={isSessionActive}
        isModelLoading={isModelLoading}
        countdown={countdown}
        error={error}
        settings={settings}
        onStart={startSession}
        onStop={stopSession}
      />

      {settings && (
        <WorkoutSettingsMenu
          settings={settings}
          onSettingsChange={updateSettings}
          disabled={isSessionActive || countdown !== null}
        />
      )}
    </div>
  );
}