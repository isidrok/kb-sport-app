import { formatSessionTime } from "../../../shared/utils/formatting-utils";
import { WorkoutSession } from "../../../shared/types/workout-types";
import styles from "./workout-metrics.module.css";

interface WorkoutMetricsProps {
  currentSession: WorkoutSession | null;
}

interface MetricDisplayProps {
  value: string | number;
  label: string;
}

function MetricDisplay({ value, label }: MetricDisplayProps) {
  return (
    <div className={styles.metric}>
      <div className={styles.metricValue}>{value}</div>
      <div className={styles.metricLabel}>{label}</div>
    </div>
  );
}

export function WorkoutMetrics({ currentSession }: WorkoutMetricsProps) {
  const totalReps = currentSession?.totalReps || 0;
  const avgRpm = currentSession ? Math.round(currentSession.repsPerMinute) : 0;
  const sessionTime = currentSession 
    ? formatSessionTime(currentSession.startTime) 
    : "00:00";
  const currentRpm = currentSession?.estimatedRepsPerMinute || 0;

  return (
    <div className={styles.overlayMetrics}>
      <MetricDisplay value={totalReps} label="Reps" />
      <MetricDisplay value={avgRpm} label="Avg RPM" />
      <MetricDisplay value={sessionTime} label="Time" />
      <MetricDisplay value={currentRpm} label="Current RPM" />
    </div>
  );
}