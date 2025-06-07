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
    error,
    isModelLoading,
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
            <div className={styles.metricLabel}>Avg RPM</div>
          </div>
          <div className={styles.metric}>
            <div className={styles.metricValue}>
              {currentSession?.estimatedRepsPerMinute || 0}
            </div>
            <div className={styles.metricLabel}>Current RPM</div>
          </div>
        </div>
        
        <div className={styles.buttonGroup}>
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
            
            {isCalibrating && (
              <div className={styles.calibrationStatus}>
                <p>📏 Calibrating... Position yourself in the overhead hold</p>
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
            disabled={isModelLoading || isCalibrating || countdown !== null || error !== null}
          >
            {isModelLoading
              ? '🧠 Loading Model...'
              : error
                ? '❌ Error'
              : isCalibrating 
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