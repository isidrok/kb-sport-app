import { useRef, useEffect } from "preact/hooks";
import { WorkoutOrchestratorService } from "../../../service/workout-orchestrator.service";
import { StorageService } from "../../../service/storage.service";
import { useWorkoutStore } from "../../../shared/store/workout-store";

export function useWorkoutOrchestrator() {
  const orchestratorRef = useRef<WorkoutOrchestratorService | null>(null);
  const storageServiceRef = useRef<StorageService | null>(null);
  const initializationDoneRef = useRef(false);

  useEffect(() => {
    if (initializationDoneRef.current) return;
    
    const initialize = async () => {
      try {
        // Initialize storage service
        if (!storageServiceRef.current) {
          storageServiceRef.current = new StorageService();
        }
        const storageService = storageServiceRef.current;
        
        await storageService.initialize();
        const savedSettings = storageService.loadSettings();
        const defaultSettings = storageService.getDefaultSettings();
        
        // Merge saved settings with defaults to ensure all fields are present
        const finalSettings = savedSettings ? {
          ...defaultSettings,
          ...savedSettings
        } : defaultSettings;
        
        // Update settings in store
        useWorkoutStore.getState().updateSettings(finalSettings);

        // Create workout service with settings and callbacks that directly call store
        orchestratorRef.current = new WorkoutOrchestratorService(
          finalSettings,
          (session) => {
            useWorkoutStore.getState().updateSession(session);
          },
          (countdown) => {
            useWorkoutStore.getState().setSessionEndCountdown(countdown);
          },
          () => {
            useWorkoutStore.getState().setSessionActive(false);
          }
        );

        // Initialize workout service
        await orchestratorRef.current.initialize();
        
        // Update final state
        const store = useWorkoutStore.getState();
        store.setModelLoading(false);
        store.setAudioAvailable(orchestratorRef.current.isAudioAvailable());
        store.setSpeechAvailable(orchestratorRef.current.isSpeechAvailable());
        
        initializationDoneRef.current = true;
      } catch (error) {
        console.error("Failed to initialize workout service:", error);
        const store = useWorkoutStore.getState();
        store.setError("Failed to load pose detection model. Please refresh the page.");
        store.setModelLoading(false);
      }
    };

    initialize();

    return () => {
      if (orchestratorRef.current) {
        orchestratorRef.current.dispose();
      }
    };
  }, []); // Empty dependency array - run only once

  return {
    orchestrator: orchestratorRef,
    storageService: storageServiceRef,
  };
}