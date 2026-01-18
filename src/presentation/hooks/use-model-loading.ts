import { useState, useEffect, useRef } from 'preact/hooks'
import { useEventBus } from './use-event-bus'
import { ModelLoadingEvent } from '@/application/events/model-loading-event'

const MINIMUM_LOADING_TIME = 800 // ms

export function useModelLoading() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [message, setMessage] = useState<string | undefined>('Loading ML model...')
  const loadingStartTime = useRef<number>(Date.now())
  const { subscribe } = useEventBus(ModelLoadingEvent)

  useEffect(() => {
    const unsubscribe = subscribe((event: ModelLoadingEvent) => {
      const elapsed = Date.now() - loadingStartTime.current
      
      if (event.data.status === 'ready' && elapsed < MINIMUM_LOADING_TIME) {
        // Delay hiding the loading state to ensure minimum display time
        setTimeout(() => {
          setStatus(event.data.status)
          setMessage(event.data.message)
        }, MINIMUM_LOADING_TIME - elapsed)
      } else {
        setStatus(event.data.status)
        setMessage(event.data.message)
      }
    })
    
    return unsubscribe
  }, [subscribe])

  return {
    status,
    message
  }
}