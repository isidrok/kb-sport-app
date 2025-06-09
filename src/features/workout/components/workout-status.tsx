import styles from "./workout-status.module.css";

interface WorkoutStatusProps {
  isModelLoading: boolean;
  error: string | null;
  countdown: number | null;
  sessionEndCountdown: number | null;
}

interface LoadingStatusProps {
  isLoading: boolean;
}

interface ErrorStatusProps {
  error: string;
}

interface CountdownDisplayProps {
  title: string;
  countdown: number;
}

function LoadingStatus({ isLoading }: LoadingStatusProps) {
  if (!isLoading) return null;

  return (
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
  );
}

function ErrorStatus({ error }: ErrorStatusProps) {
  return (
    <div className={styles.calibrationStatus}>
      <p>❌ {error}</p>
    </div>
  );
}

function CountdownDisplay({ title, countdown }: CountdownDisplayProps) {
  return (
    <div className={styles.countdownDisplay}>
      <p>{title}</p>
      <div className={styles.countdownNumber}>{countdown}</div>
    </div>
  );
}

export function WorkoutStatus({
  isModelLoading,
  error,
  countdown,
  sessionEndCountdown,
}: WorkoutStatusProps) {
  return (
    <div className={styles.statusContainer}>
      <LoadingStatus isLoading={isModelLoading} />
      
      {error && <ErrorStatus error={error} />}
      
      {countdown !== null && (
        <CountdownDisplay title="Get ready!" countdown={countdown} />
      )}
      
      {sessionEndCountdown !== null && (
        <CountdownDisplay 
          title="Session ending!" 
          countdown={sessionEndCountdown} 
        />
      )}
    </div>
  );
}