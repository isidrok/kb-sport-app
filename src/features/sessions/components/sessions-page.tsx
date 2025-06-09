import { useState } from "preact/hooks";
import { useSessionsData } from "../hooks/use-sessions-data";
import { useSessionActions } from "../hooks/use-session-actions";
import { SessionCard } from "./session-card";
import styles from "./sessions-page.module.css";

export function SessionsPage() {
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  
  const { sessions, loading, error, refreshSessions } = useSessionsData();
  const { viewRecording, downloadRecording, deleteSession } = useSessionActions();

  const handleDeleteSession = (sessionId: string) => {
    deleteSession(sessionId, () => {
      refreshSessions();
    });
  };

  const handleViewChart = (sessionId: string) => {
    setSelectedSession(selectedSession === sessionId ? null : sessionId);
  };



  if (loading) {
    return (
      <div className={styles.sessionsPage}>
        <div className={styles.empty}>
          <div className={styles.emptyTitle}>Loading sessions...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.sessionsPage}>
        <div className={styles.empty}>
          <div className={styles.emptyTitle}>Error loading sessions</div>
          <div className={styles.emptyText}>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.sessionsPage}>
      {sessions.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyTitle}>No sessions yet</div>
          <div className={styles.emptyText}>
            Start your first workout to see it here
          </div>
        </div>
      ) : (
        <div className={styles.sessionsList}>
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              isChartVisible={selectedSession === session.id}
              onViewRecording={viewRecording}
              onDownloadRecording={downloadRecording}
              onToggleChart={handleViewChart}
              onDeleteSession={handleDeleteSession}
            />
          ))}
        </div>
      )}
    </div>
  );
}
