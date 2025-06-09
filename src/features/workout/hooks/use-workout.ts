import { useRef } from "preact/hooks";
import { useWorkoutStore } from "../../../shared/store/workout-store";
import { useWorkoutOrchestrator } from "./use-workout-orchestrator";
import { useWorkoutActions } from "./use-workout-actions";

export function useWorkout() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Get state from store using individual selectors to avoid unnecessary re-renders
  const currentSession = useWorkoutStore((state) => state.currentSession);
  const isSessionActive = useWorkoutStore((state) => state.isSessionActive);
  const countdown = useWorkoutStore((state) => state.countdown);
  const sessionEndCountdown = useWorkoutStore(
    (state) => state.sessionEndCountdown
  );
  const error = useWorkoutStore((state) => state.error);
  const isModelLoading = useWorkoutStore((state) => state.isModelLoading);
  const isSettingsLoaded = useWorkoutStore((state) => state.isSettingsLoaded);
  const settings = useWorkoutStore((state) => state.settings);
  const isAudioAvailable = useWorkoutStore((state) => state.isAudioAvailable);
  const isSpeechAvailable = useWorkoutStore((state) => state.isSpeechAvailable);

  // Initialize orchestrator
  const { orchestrator, storageService } = useWorkoutOrchestrator();

  // Get actions
  const { startSession, stopSession, updateSettings } = useWorkoutActions(
    orchestrator,
    storageService,
    videoRef,
    canvasRef
  );

  return {
    videoRef,
    canvasRef,
    isSessionActive,
    currentSession,
    countdown,
    sessionEndCountdown,
    error,
    isModelLoading,
    settings,
    isSettingsLoaded,
    startSession,
    stopSession,
    updateSettings,
    // Audio feedback status methods
    isAudioAvailable: () => isAudioAvailable,
    isSpeechAvailable: () => isSpeechAvailable,
  };
}