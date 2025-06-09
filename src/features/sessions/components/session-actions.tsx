import { WorkoutMetadata } from "../../../service/storage.service";
import styles from "./session-actions.module.css";

interface SessionActionsProps {
  session: WorkoutMetadata;
  isChartVisible: boolean;
  onViewRecording: (sessionId: string) => void;
  onDownloadRecording: (sessionId: string) => void;
  onToggleChart: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
}

interface ActionButtonProps {
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'delete';
  children: preact.ComponentChildren;
}

function ActionButton({ onClick, disabled = false, variant = 'default', children }: ActionButtonProps) {
  const buttonClass = variant === 'delete' 
    ? `${styles.actionButton} ${styles.deleteButton}`
    : styles.actionButton;

  return (
    <button
      className={buttonClass}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function SessionActions({
  session,
  isChartVisible,
  onViewRecording,
  onDownloadRecording,
  onToggleChart,
  onDeleteSession,
}: SessionActionsProps) {
  const hasVideo = session.videoSize > 0;

  return (
    <div className={styles.sessionActions}>
      <ActionButton
        onClick={() => onViewRecording(session.id)}
        disabled={!hasVideo}
      >
        View Recording
      </ActionButton>
      
      <ActionButton
        onClick={() => onDownloadRecording(session.id)}
        disabled={!hasVideo}
      >
        Download
      </ActionButton>
      
      <ActionButton onClick={() => onToggleChart(session.id)}>
        {isChartVisible ? "Hide Chart" : "View Chart"}
      </ActionButton>
      
      <ActionButton
        onClick={() => onDeleteSession(session.id)}
        variant="delete"
      >
        Delete
      </ActionButton>
    </div>
  );
}