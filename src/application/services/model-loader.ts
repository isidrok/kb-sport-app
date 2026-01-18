import {
  predictionAdapter,
  type PredictionAdapter,
} from "@/infrastructure/adapters/prediction.adapter";
import { eventBus, type EventBus } from "@/infrastructure/event-bus/event-bus";
import { ModelLoadingEvent } from "@/application/events/model-loading-event";

interface ModelLoaderServiceDependencies {
  predictionAdapter: PredictionAdapter;
  eventBus: EventBus;
}

/**
 * Service that handles ML model loading with event-based progress feedback.
 *
 * Responsibilities:
 * - Initialize the prediction adapter
 * - Publish loading status events for UI feedback
 * - Handle loading errors gracefully
 */
export class ModelLoaderService {
  constructor(private dependencies: ModelLoaderServiceDependencies) {}

  async load(): Promise<void> {
    try {
      this.dependencies.eventBus.publish(
        new ModelLoadingEvent({
          status: "loading",
          message: "Loading ML model...",
        })
      );

      await this.dependencies.predictionAdapter.initialize();

      this.dependencies.eventBus.publish(
        new ModelLoadingEvent({
          status: "ready",
          message: "Model loaded successfully",
        })
      );
    } catch (error) {
      console.error("Failed to load model:", error);

      this.dependencies.eventBus.publish(
        new ModelLoadingEvent({
          status: "error",
          message:
            error instanceof Error ? error.message : "Failed to load model",
        })
      );

      throw error;
    }
  }
}

// Export singleton instance
export const modelLoaderService = new ModelLoaderService({
  predictionAdapter,
  eventBus,
});
