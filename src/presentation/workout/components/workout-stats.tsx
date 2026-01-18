import { useWorkoutState } from '../hooks/use-workout-state'
import { SessionState } from '@/domain/events/session-events'
import { WorkoutStatsCard } from './workout-stats-card'
import styles from './workout-stats.module.css'

export function WorkoutStats() {
  const { sessionState, stats } = useWorkoutState()

  // Only show stats during Running and Finished states
  const showStats = sessionState === SessionState.Running || sessionState === SessionState.Finished

  if (!showStats) {
    return null
  }

  return (
    <div className={styles.overlay}>
      <WorkoutStatsCard value={stats.repCount} label="Reps" />
      <WorkoutStatsCard value={stats.formattedTime} label="Time" />
      <WorkoutStatsCard value={`${stats.averageRPM} RPM`} label="Avg Speed" />
      <WorkoutStatsCard value={`${stats.currentRPM} RPM`} label="Current Speed" />
    </div>
  )
}
