import { useRef } from "preact/hooks";
import { useWorkoutStore } from "../../../shared/store/workout-store";
import { useWorkoutActions } from "./use-workout-actions";
import { useServicesStore } from "../../../shared/store/services-store";
import { useServicesInitialization } from "../../../shared/hooks/use-services-initialization";

export function useWorkout() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Get state from workout store
  const currentSession = useWorkoutStore((state) => state.currentSession);
  const isSessionActive = useWorkoutStore((state) => state.isSessionActive);
  const countdown = useWorkoutStore((state) => state.countdown);
  const sessionEndCountdown = useWorkoutStore((state) => state.sessionEndCountdown);
  const error = useWorkoutStore((state) => state.error);
  const isModelLoading = useWorkoutStore((state) => state.isModelLoading);
  const settings = useWorkoutStore((state) => state.settings);

  // Initialize services and get status
  const { servicesInitialized } = useServicesInitialization();
  const audioFeedbackService = useServicesStore((state) => state.audioFeedbackService);

  // Get actions
  const {
    prepareCameraAndCanvas,
    startCountdown,
    stopSession,
    updateSettings,
  } = useWorkoutActions();

  const handleStartSession = async () => {
    if (!videoRef.current || !canvasRef.current || !settings) return;

    // First prepare camera if not already done
    await prepareCameraAndCanvas(videoRef.current, canvasRef.current);
    
    // Then start countdown
    await startCountdown(settings.countdownDuration, videoRef.current);
  };

  return {
    videoRef,
    canvasRef,
    isSessionActive,
    currentSession,
    countdown,
    sessionEndCountdown,
    error,
    isModelLoading: isModelLoading || !servicesInitialized,
    settings,
    startSession: handleStartSession,
    stopSession,
    updateSettings,
    // Audio feedback status methods
    isAudioAvailable: audioFeedbackService?.isAudioAvailable() ?? false,
    isSpeechAvailable: audioFeedbackService?.isSpeechAvailable() ?? false,
  };
}