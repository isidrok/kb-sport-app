import { useWorkout } from './useWorkout';
import styles from './WorkoutPage.module.css';

export function WorkoutPage() {
  const {
    videoRef,
    canvasRef,
    videoContainerRef,
    isSessionActive,
    currentSession,
    isCalibrating,
    calibrationProgress,
    countdown,
    startSession,
    stopSession,
  } = useWorkout();

  return (
    <div className={styles.workoutPage}>
      <div ref={videoContainerRef} className={styles.videoContainer}>
        <video
          ref={videoRef}
          className={styles.video}
          playsInline
          autoPlay
          muted
        />
        <canvas ref={canvasRef} className={styles.canvas} />
      </div>
      
      <div className={styles.controls}>
        <div className={styles.metrics}>
          <div className={styles.metric}>
            <div className={styles.metricValue}>
              {currentSession?.totalReps || 0}
            </div>
            <div className={styles.metricLabel}>Total Reps</div>
          </div>
          <div className={styles.metric}>
            <div className={styles.metricValue}>
              {currentSession ? Math.round(currentSession.repsPerMinute) : 0}
            </div>
            <div className={styles.metricLabel}>Reps/Min</div>
          </div>
        </div>
        
        <div className={styles.buttonGroup}>
          <div className={styles.statusContainer}>
            {isCalibrating && (
              <div className={styles.calibrationStatus}>
                <p>📏 Calibrating... Raise your arms fully overhead</p>
                <div className={styles.progressBar}>
                  <div 
                    className={styles.progressFill} 
                    style={{ width: `${calibrationProgress * 100}%` }}
                  />
                </div>
                <p>{Math.round(calibrationProgress * 100)}% complete</p>
              </div>
            )}
            
            {countdown !== null && (
              <div className={styles.countdownDisplay}>
                <p>Get ready!</p>
                <div className={styles.countdownNumber}>{countdown}</div>
              </div>
            )}
          </div>
          
          <button
            className={`${styles.sessionButton} ${isSessionActive ? styles.stop : styles.start}`}
            onClick={isSessionActive ? stopSession : startSession}
            disabled={isCalibrating || countdown !== null}
          >
            {isCalibrating 
              ? '⏳ Calibrating...' 
              : countdown !== null
                ? `⏳ Starting in ${countdown}...`
              : isSessionActive 
                ? '⏹️ Stop Session' 
                : '▶️ Start Session'
            }
          </button>
        </div>
      </div>
    </div>
  );
}