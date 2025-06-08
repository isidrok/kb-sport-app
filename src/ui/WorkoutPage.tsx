import { useWorkout } from './useWorkout';
import { useWorkoutSettings } from './useWorkoutSettings';
import { WorkoutSettingsMenu } from './WorkoutSettings';
import styles from './WorkoutPage.module.css';

export function WorkoutPage() {
  const {
    videoRef,
    canvasRef,
    isSessionActive,
    currentSession,
    countdown,
    error,
    isModelLoading,
    startSession,
    stopSession,
  } = useWorkout();

  const {
    settings,
    updateSettings,
    getAudioFeedbackService,
    getCountdownDuration,
    isSettingsLoaded,
  } = useWorkoutSettings();

  const handleStartSession = async () => {
    if (!settings) return;
    
    const audioService = getAudioFeedbackService();
    const countdownDuration = getCountdownDuration();
    
    await startSession(
      countdownDuration,
      // onCountdownBeep
      audioService ? () => audioService.playCountdownBeep() : undefined,
      // onStart
      audioService ? () => {
        audioService.playStartBeep();
        if (currentSession) {
          audioService.startSession(currentSession);
        }
      } : undefined
    );
  };

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
            {currentSession ? 
              Math.floor((Date.now() - currentSession.startTime) / 60000).toString().padStart(2, '0') + ':' +
              Math.floor(((Date.now() - currentSession.startTime) % 60000) / 1000).toString().padStart(2, '0')
              : '00:00'
            }
          </div>
          <div className={styles.metricLabel}>Time</div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricValue}>
            {currentSession?.estimatedRepsPerMinute || 0}
          </div>
          <div className={styles.metricLabel}>Current RPM</div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricValue}>
            {currentSession ? Math.round(currentSession.repsPerMinute) : 0}
          </div>
          <div className={styles.metricLabel}>Avg RPM</div>
        </div>
      </div>
      
      <div className={styles.controls}>
        <div className={styles.statusContainer}>
          {isModelLoading && (
            <div className={styles.calibrationStatus}>
              <p>🧠 Loading pose detection model...</p>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: '100%', animation: 'pulse 1.5s ease-in-out infinite' }} />
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
        </div>
        
        <div className={styles.buttonRow}>
          <button
            className={`${styles.sessionButton} ${isSessionActive ? styles.stop : styles.start}`}
            onClick={isSessionActive ? stopSession : handleStartSession}
            disabled={isModelLoading || countdown !== null || error !== null || !isSettingsLoaded}
          >
            {isModelLoading
              ? '🧠'
              : error
                ? '❌'
              : countdown !== null
                ? '⏳'
                : isSessionActive 
                  ? '⏹️' 
                  : '▶️'
            }
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