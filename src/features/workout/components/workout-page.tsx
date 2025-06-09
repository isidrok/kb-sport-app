import { useWorkout } from "../hooks/use-workout";
import { WorkoutSettingsMenu } from "./workout-settings";
import { formatSessionTime } from "../../../shared/utils/formatting-utils";
import styles from "./workout-page.module.css";

export function WorkoutPage() {
  const {
    videoRef,
    canvasRef,
    isSessionActive,
    currentSession,
    countdown,
    sessionEndCountdown,
    error,
    isModelLoading,
    settings,
    isSettingsLoaded,
    startSession,
    stopSession,
    updateSettings,
  } = useWorkout();

  return (
    <div className={styles.workoutPage}>
      <div className={styles.videoContainer}>
        <video
          ref={videoRef}
          className={styles.video}
          playsInline
          autoPlay
          muted
        />
        <canvas ref={canvasRef} className={styles.canvas} />
      </div>

      <div className={styles.overlayMetrics}>
        <div className={styles.metric}>
          <div className={styles.metricValue}>
            {currentSession?.totalReps || 0}
          </div>
          <div className={styles.metricLabel}>Reps</div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricValue}>
            {currentSession ? Math.round(currentSession.repsPerMinute) : 0}
          </div>
          <div className={styles.metricLabel}>Avg RPM</div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricValue}>
            {currentSession
              ? formatSessionTime(currentSession.startTime)
              : "00:00"}
          </div>
          <div className={styles.metricLabel}>Time</div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricValue}>
            {currentSession?.estimatedRepsPerMinute || 0}
          </div>
          <div className={styles.metricLabel}>Current RPM</div>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.statusContainer}>
          {isModelLoading && (
            <div className={styles.calibrationStatus}>
              <p>🧠 Loading pose detection model...</p>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{
                    width: "100%",
                    animation: "pulse 1.5s ease-in-out infinite",
                  }}
                />
              </div>
            </div>
          )}

          {error && (
            <div className={styles.calibrationStatus}>
              <p>❌ {error}</p>
            </div>
          )}

          {countdown !== null && (
            <div className={styles.countdownDisplay}>
              <p>Get ready!</p>
              <div className={styles.countdownNumber}>{countdown}</div>
            </div>
          )}

          {sessionEndCountdown !== null && (
            <div className={styles.countdownDisplay}>
              <p>Session ending!</p>
              <div className={styles.countdownNumber}>
                {sessionEndCountdown}
              </div>
            </div>
          )}
        </div>

        <div className={styles.buttonRow}>
          <button
            className={`${styles.sessionButton} ${
              isSessionActive ? styles.stop : styles.start
            }`}
            onClick={isSessionActive ? stopSession : startSession}
            disabled={
              isModelLoading ||
              countdown !== null ||
              error !== null ||
              !isSettingsLoaded
            }
          >
            {isModelLoading
              ? "🧠"
              : error
              ? "❌"
              : countdown !== null
              ? "⏳"
              : isSessionActive
              ? "⏹️"
              : "▶️"}
          </button>

          {settings && (
            <WorkoutSettingsMenu
              settings={settings}
              onSettingsChange={updateSettings}
              disabled={isSessionActive || countdown !== null}
            />
          )}
        </div>
      </div>
    </div>
  );
}
