import { Icon } from "@/presentation/components/icon";
import styles from "./workout-history-button.module.css";

interface WorkoutHistoryButtonProps {
  onClick: () => void;
  isDisabled: boolean;
}

export function WorkoutHistoryButton({
  onClick,
  isDisabled,
}: WorkoutHistoryButtonProps) {
  return (
    <button
      className={styles.historyButton}
      onClick={onClick}
      data-testid="history-button"
      disabled={isDisabled}
    >
      <Icon name="history" className={styles.buttonIcon} />
    </button>
  );
}
