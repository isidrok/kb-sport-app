import { useState, useEffect } from 'preact/hooks'
import { useEventBus } from '../../hooks/use-event-bus'
import { workoutSessionManager } from '@/application/workout-session-manager'
import { CameraAccessEvent } from '@/application/events/camera-access-event'

export function useWorkoutActions() {
  const [cameraError, setCameraError] = useState<string | undefined>(undefined)
  const [isStarting, setIsStarting] = useState(false)
  const { subscribe } = useEventBus(CameraAccessEvent)

  useEffect(() => {
    const unsubscribe = subscribe((event: CameraAccessEvent) => {
      if (event.data.status === 'error') {
        setCameraError(event.data.message)
      } else {
        setCameraError(undefined)
      }
    })
    
    return unsubscribe
  }, [subscribe])

  const startPreview = async (videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement) => {
    setIsStarting(true)
    try {
      await workoutSessionManager.startPreview(videoElement, canvasElement)
    } finally {
      setIsStarting(false)
    }
  }

  const stopPreview = () => {
    try {
      workoutSessionManager.stopPreview()
    } catch (error) {
      console.error('Error stopping preview:', error)
    }
  }

  const startWorkout = async () => {
    try {
      await workoutSessionManager.startWorkout()
    } catch (error) {
      console.error('Error starting workout:', error)
    }
  }

  const stopWorkout = async () => {
    try {
      await workoutSessionManager.stopWorkout()
    } catch (error) {
      console.error('Error stopping workout:', error)
    }
  }

  const reset = () => {
    try {
      workoutSessionManager.reset()
    } catch (error) {
      console.error('Error resetting:', error)
    }
  }

  return {
    isStarting,
    startPreview,
    stopPreview,
    startWorkout,
    stopWorkout,
    reset,
    cameraError
  }
}
