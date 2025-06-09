import { useCallback, useRef } from "preact/hooks";
import { useWorkoutStore } from "../../../shared/store/workout-store";
import { WorkoutSettings } from "../../../shared/types/workout-types";

export function useWorkoutActions(
  orchestrator: any,
  storageService: any,
  videoRef: any,
  canvasRef: any
) {
  const countdownIntervalRef = useRef<number | null>(null);

  const clearCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
      useWorkoutStore.getState().setCountdown(null);
    }
  }, []);

  const startCountdown = useCallback(async (
    duration: number,
    onCountdownComplete: () => Promise<void>
  ) => {
    if (!orchestrator?.current) return;
    
    let count = duration;
    if (count === 0) {
      // No countdown, start immediately
      await onCountdownComplete();
      return;
    }

    useWorkoutStore.getState().setCountdown(count);
    
    // Play initial countdown beep for the first number
    try {
      await orchestrator.current.playCountdownBeep();
    } catch (error) {
      console.error("Failed to play countdown beep:", error);
    }

    countdownIntervalRef.current = window.setInterval(async () => {
      count--;
      if (count > 0) {
        useWorkoutStore.getState().setCountdown(count);
        // Play countdown beep for each remaining number
        try {
          if (orchestrator.current) {
            await orchestrator.current.playCountdownBeep();
          }
        } catch (error) {
          console.error("Failed to play countdown beep:", error);
        }
      } else {
        useWorkoutStore.getState().setCountdown(null);
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        
        // Play start beep and start workout
        try {
          if (orchestrator.current) {
            await orchestrator.current.playStartBeep();
          }
          await onCountdownComplete();
        } catch (error) {
          console.error("Failed to complete countdown:", error);
          useWorkoutStore.getState().setError("Failed to start workout after countdown.");
        }
      }
    }, 1000);
  }, [orchestrator]);

  const startWorkout = useCallback(async () => {
    if (!orchestrator?.current) return;
    
    try {
      await orchestrator.current.startWorkout(videoRef.current!);
      useWorkoutStore.getState().setSessionActive(true);
    } catch (error) {
      console.error("Failed to start workout:", error);
      useWorkoutStore.getState().setError("Failed to start workout. Please try again.");
    }
  }, [orchestrator, videoRef]);

  const startSession = useCallback(async () => {
    const store = useWorkoutStore.getState();
    if (!orchestrator?.current || !store.settings) return;
    
    // Clear previous session data when starting new workout
    store.resetSession();
    
    try {
      // Prepare camera and start processing loop
      await orchestrator.current.prepareCamera(videoRef.current!, canvasRef.current!);
      
      // Start countdown based on settings
      const countdownDuration = store.settings.countdownDuration || 0;
      await startCountdown(countdownDuration, startWorkout);
    } catch (error) {
      console.error("Failed to start session:", error);
      store.setError("Failed to start workout session. Please try again.");
    }
  }, [orchestrator, videoRef, canvasRef, startCountdown, startWorkout]);

  const stopSession = useCallback(async () => {
    // Clear countdown if running
    clearCountdown();
    
    if (!orchestrator?.current) return;
    
    try {
      await orchestrator.current.stop();
      useWorkoutStore.getState().setSessionActive(false);
      // Keep session data visible for user to see results
    } catch (error) {
      console.error("Failed to stop session:", error);
      useWorkoutStore.getState().setError("Failed to stop workout session.");
    }
  }, [orchestrator, clearCountdown]);

  const updateSettings = useCallback((newSettings: WorkoutSettings) => {
    useWorkoutStore.getState().updateSettings(newSettings);
    if (storageService?.current) {
      storageService.current.saveSettings(newSettings);
    }
    
    // Update workout service if it exists
    if (orchestrator?.current) {
      orchestrator.current.updateSettings(newSettings);
    }
  }, [storageService, orchestrator]);

  return {
    startSession,
    stopSession,
    updateSettings,
  };
}