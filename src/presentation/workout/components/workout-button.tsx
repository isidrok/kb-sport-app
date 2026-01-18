import styles from './workout-controls.module.css'
import { Icon } from '@/presentation/components/icon'

export interface WorkoutButtonProps {
  canStart: boolean
  canStop: boolean
  isStarting: boolean
  onStartWorkout: () => void
  onStopWorkout: () => void
}

export function WorkoutButton(props: WorkoutButtonProps) {
  const buttonText = props.canStart ? 'Start' : 'Stop'
  const iconName = props.canStart ? 'play_arrow' : 'stop'
  const buttonClass = props.canStop ? styles.activeButton : ''
  const isDisabled = props.isStarting || (!props.canStart && !props.canStop)
  
  const handleClick = () => {
    if (props.canStart) {
      props.onStartWorkout()
    } else if (props.canStop) {
      props.onStopWorkout()
    }
  }
  
  return (
    <button 
      className={buttonClass}
      disabled={isDisabled} 
      onClick={handleClick}
      aria-label={buttonText}
    >
      <Icon name={iconName} className={styles.buttonIcon} />
    </button>
  )
}