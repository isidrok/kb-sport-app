import { FloatingButton } from '@/presentation/components/floating-button'

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
  const isDisabled = props.isStarting || (!props.canStart && !props.canStop)
  
  const handleClick = () => {
    if (props.canStart) {
      props.onStartWorkout()
    } else if (props.canStop) {
      props.onStopWorkout()
    }
  }
  
  return (
    <FloatingButton
      icon={iconName}
      onClick={handleClick}
      disabled={isDisabled}
      ariaLabel={buttonText}
      active={props.canStop}
    />
  )
}