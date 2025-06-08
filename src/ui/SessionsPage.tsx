import { useEffect, useState } from "preact/hooks";
import { StorageService, WorkoutMetadata } from "../service/storage.service";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import styles from "./SessionsPage.module.css";

export function SessionsPage() {
  const [sessions, setSessions] = useState<WorkoutMetadata[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [storageService] = useState(() => new StorageService());

  useEffect(() => {
    initializeAndLoadSessions();
  }, []);

  const initializeAndLoadSessions = async () => {
    try {
      await storageService.initialize();
      const allSessions = await storageService.getAllWorkouts();
      setSessions(allSessions);
    } catch (error) {
      console.error("Failed to load sessions:", error);
    }
  };

  const handleViewRecording = async (sessionId: string) => {
    try {
      const workout = await storageService.getWorkout(sessionId);
      if (workout?.videoBlob) {
        const videoUrl = URL.createObjectURL(workout.videoBlob);
        window.open(videoUrl, "_blank");
      }
    } catch (error) {
      console.error("Failed to view recording:", error);
    }
  };

  const handleDownloadRecording = async (sessionId: string) => {
    try {
      const workout = await storageService.getWorkout(sessionId);
      if (workout?.videoBlob) {
        const url = URL.createObjectURL(workout.videoBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `workout-${sessionId}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Failed to download recording:", error);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (confirm("Are you sure you want to delete this session?")) {
      try {
        await storageService.deleteWorkout(sessionId);
        setSessions(sessions.filter((s) => s.id !== sessionId));
      } catch (error) {
        console.error("Failed to delete session:", error);
      }
    }
  };

  const handleViewChart = (sessionId: string) => {
    setSelectedSession(selectedSession === sessionId ? null : sessionId);
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderRepChart = (session: WorkoutMetadata) => {
    // Create reps per minute data
    const repsPerMinuteData: Array<{ minute: number; reps: number }> = [];
    const repsPerMinute = new Map<number, number>();

    session.reps.forEach((rep) => {
      const minute = Math.floor((rep.timestamp - session.timestamp) / 60000);
      repsPerMinute.set(minute, (repsPerMinute.get(minute) || 0) + 1);
    });

    const totalMinutes = Math.ceil(session.duration / 60000);
    for (let i = 0; i < totalMinutes; i++) {
      repsPerMinuteData.push({
        minute: i + 1,
        reps: repsPerMinute.get(i) || 0,
      });
    }

    return (
      <div className={styles.chart}>
        <div className={styles.chartTitle}>Reps per Minute</div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={repsPerMinuteData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="minute"
              tickFormatter={(value: any) => `${value}m`}
            />
            <YAxis />
            <Tooltip 
              labelFormatter={(value: any) => `Minute ${value}`}
              formatter={(value: any) => [`${value}`, 'Reps']}
            />
            <Line 
              type="monotone" 
              dataKey="reps" 
              stroke="#8884d8" 
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

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
            <div key={session.id} className={styles.sessionCard}>
              <div className={styles.sessionHeader}>
                <div className={styles.sessionMeta}>
                  <div className={styles.sessionDate}>
                    {formatDate(session.timestamp)}
                  </div>
                  <div className={styles.sessionDuration}>
                    {formatDuration(session.duration)}
                  </div>
                </div>
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
              </div>

              <div className={styles.sessionActions}>
                <button
                  className={styles.actionButton}
                  onClick={() => handleViewRecording(session.id)}
                  disabled={session.videoSize === 0}
                >
                  View Recording
                </button>
                <button
                  className={styles.actionButton}
                  onClick={() => handleDownloadRecording(session.id)}
                  disabled={session.videoSize === 0}
                >
                  Download
                </button>
                <button
                  className={styles.actionButton}
                  onClick={() => handleViewChart(session.id)}
                >
                  {selectedSession === session.id ? "Hide Chart" : "View Chart"}
                </button>
                <button
                  className={`${styles.actionButton} ${styles.deleteButton}`}
                  onClick={() => handleDeleteSession(session.id)}
                >
                  Delete
                </button>
              </div>

              {selectedSession === session.id && renderRepChart(session)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
