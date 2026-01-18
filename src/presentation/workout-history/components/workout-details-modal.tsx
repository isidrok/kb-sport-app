import { useEffect } from "preact/hooks";
import { WorkoutMetadata } from "@/domain/types/workout-storage.types";
import { formatDateTime } from "@/presentation/format/date";
import { Icon } from "@/presentation/components/icon";
import { RepsPerMinuteChart } from "./reps-per-minute-chart";
import styles from "./workout-details-modal.module.css";

interface WorkoutDetailsModalProps {
  isOpen: boolean;
  metadata: WorkoutMetadata | null;
  isLoading: boolean;
  onClose: () => void;
}

export function WorkoutDetailsModal({
  isOpen,
  metadata,
  isLoading,
  onClose,
}: WorkoutDetailsModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const formatDuration = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={styles.backdrop}
      data-testid="details-modal-backdrop"
      onClick={onClose}
    >
      <div
        role="dialog"
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>Workout Details</h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className={styles.content}>
          {isLoading ? (
            <div className={styles.loading}>
              <div className={styles.loadingIcon}>
                <Icon name="hourglass_empty" />
              </div>
              <div className={styles.loadingText}>Loading workout details...</div>
            </div>
          ) : metadata ? (
            <>
              <div className={styles.summary}>
                <div className={styles.summaryItem}>
                  <div className={styles.summaryLabel}>Date</div>
                  <div className={styles.summaryValue}>
                    {formatDateTime(new Date(metadata.startTime))}
                  </div>
                </div>
                <div className={styles.summaryItem}>
                  <div className={styles.summaryLabel}>Duration</div>
                  <div className={styles.summaryValue}>
                    {formatDuration(metadata.duration)}
                  </div>
                </div>
                <div className={styles.summaryItem}>
                  <div className={styles.summaryLabel}>Total Reps</div>
                  <div className={styles.summaryValue}>{metadata.totalReps}</div>
                </div>
                <div className={styles.summaryItem}>
                  <div className={styles.summaryLabel}>Avg RPM</div>
                  <div className={styles.summaryValue}>{metadata.rpm}</div>
                </div>
              </div>

              <RepsPerMinuteChart metadata={metadata} />
            </>
          ) : (
            <div className={styles.error}>
              <Icon name="error" className={styles.errorIcon} />
              <div>Failed to load workout details</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
