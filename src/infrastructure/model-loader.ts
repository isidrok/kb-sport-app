import { predictionAdapter } from './adapters/prediction.adapter'
import { eventBus } from './event-bus/event-bus'
import { ModelLoadingEvent } from '@/application/events/model-loading-event'

/**
 * Simple model loader that initializes the prediction adapter
 * and publishes loading events for UI feedback
 */
export async function loadModel(): Promise<void> {
  try {
    eventBus.publish(new ModelLoadingEvent({
      status: 'loading',
      message: 'Loading AI model...'
    }))

    await predictionAdapter.initialize()

    eventBus.publish(new ModelLoadingEvent({
      status: 'ready',
      message: 'Model loaded successfully'
    }))
  } catch (error) {
    console.error('Failed to load model:', error)
    
    eventBus.publish(new ModelLoadingEvent({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to load model'
    }))

    throw error
  }
}
