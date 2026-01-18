import { useWorkoutState } from "../hooks/use-workout-state";
import { WorkoutStatsCard } from "./workout-stats-card";
import styles from "./workout-stats.module.css";

export function WorkoutStats() {
  const { stats } = useWorkoutState();

  return (
    <div className={styles.overlay}>
      <WorkoutStatsCard value={stats.repCount} label="Reps" />
      <WorkoutStatsCard value={stats.formattedTime} label="Time" />
      <WorkoutStatsCard value={`${stats.averageRPM} RPM`} label="Avg Speed" />
      <WorkoutStatsCard
        value={`${stats.currentRPM} RPM`}
        label="Current Speed"
      />
    </div>
  );
}
