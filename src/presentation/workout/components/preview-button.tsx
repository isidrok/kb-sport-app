import { FloatingButton } from '@/presentation/components/floating-button'

export interface PreviewButtonProps {
  isPreviewActive: boolean
  isDisabled: boolean
  onStartPreview: () => void
  onStopPreview: () => void
}

export function PreviewButton(props: PreviewButtonProps) {
  const buttonText = props.isPreviewActive ? 'Stop Preview' : 'Start Preview'
  const iconName = props.isPreviewActive ? 'visibility_off' : 'visibility'
  
  const handleClick = () => {
    if (props.isPreviewActive) {
      props.onStopPreview()
    } else {
      props.onStartPreview()
    }
  }
  
  return (
    <FloatingButton
      icon={iconName}
      onClick={handleClick}
      disabled={props.isDisabled}
      ariaLabel={buttonText}
      active={props.isPreviewActive}
    />
  )
}