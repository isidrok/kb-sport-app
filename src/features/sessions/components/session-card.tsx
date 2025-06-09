import { WorkoutMetadata } from "../../../service/storage.service";
import { formatDuration, formatDate } from "../../../shared/utils/formatting-utils";
import { SessionActions } from "./session-actions";
import { RepChart } from "./rep-chart";
import styles from "./session-card.module.css";

interface SessionCardProps {
  session: WorkoutMetadata;
  isChartVisible: boolean;
  onViewRecording: (sessionId: string) => void;
  onDownloadRecording: (sessionId: string) => void;
  onToggleChart: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
}

interface SessionMetaProps {
  session: WorkoutMetadata;
}

interface SessionStatsProps {
  session: WorkoutMetadata;
}

function SessionMeta({ session }: SessionMetaProps) {
  return (
    <div className={styles.sessionMeta}>
      <div className={styles.sessionDate}>
        {formatDate(session.timestamp)}
      </div>
      <div className={styles.sessionDuration}>
        {formatDuration(session.duration)}
      </div>
    </div>
  );
}

function SessionStats({ session }: SessionStatsProps) {
  return (
    <div className={styles.sessionStats}>
      <div className={styles.sessionStat}>
        <span className={styles.sessionStatValue}>
          {session.totalReps}
        </span>
        <span className={styles.sessionStatLabel}>reps</span>
      </div>
      <div className={styles.sessionStat}>
        <span className={styles.sessionStatValue}>
          {Math.round(session.avgRepsPerMinute)}
        </span>
        <span className={styles.sessionStatLabel}>rpm</span>
      </div>
    </div>
  );
}

export function SessionCard({
  session,
  isChartVisible,
  onViewRecording,
  onDownloadRecording,
  onToggleChart,
  onDeleteSession,
}: SessionCardProps) {
  return (
    <div className={styles.sessionCard}>
      <div className={styles.sessionHeader}>
        <SessionMeta session={session} />
        <SessionStats session={session} />
      </div>

      <SessionActions
        session={session}
        isChartVisible={isChartVisible}
        onViewRecording={onViewRecording}
        onDownloadRecording={onDownloadRecording}
        onToggleChart={onToggleChart}
        onDeleteSession={onDeleteSession}
      />

      {isChartVisible && <RepChart session={session} />}
    </div>
  );
}