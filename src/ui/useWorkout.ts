import { useRef, useEffect, useState } from "preact/hooks";
import { WorkoutOrchestratorService, AppState, WorkoutCallbacks } from "../service/workout-orchestrator.service";
import { WorkoutSession } from "../service/rep-counting.service";

export function useWorkout() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  
  const [appState, setAppState] = useState<AppState>('idle');
  const [currentSession, setCurrentSession] = useState<WorkoutSession | null>(null);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(true);

  const callbacks: WorkoutCallbacks = {
    onStateChange: setAppState,
    onCalibrationProgress: setCalibrationProgress,
    onCountdown: setCountdown,
    onSessionUpdate: setCurrentSession,
    onError: (errorMessage: string) => {
      console.error(errorMessage);
      setError(errorMessage);
    },
  };

  const orchestratorRef = useRef<WorkoutOrchestratorService>();
  
  if (!orchestratorRef.current) {
    orchestratorRef.current = new WorkoutOrchestratorService(callbacks);
  }
  
  const orchestrator = orchestratorRef.current;

  useEffect(() => {
    const initialize = async () => {
      try {
        await orchestrator.initialize();
        setIsModelLoading(false);
      } catch (error) {
        console.error("Failed to initialize orchestrator:", error);
        setError("Failed to load pose detection model. Please refresh the page.");
        setIsModelLoading(false);
      }
    };

    initialize();

    return () => {
      orchestrator.dispose();
    };
  }, [orchestrator]);

  // Set DOM elements when they're available
  useEffect(() => {
    if (videoRef.current && canvasRef.current && videoContainerRef.current) {
      orchestrator.setElements(
        videoRef.current,
        canvasRef.current,
        videoContainerRef.current
      );
    }
  }, [orchestrator]);

  const startSession = async () => {
    setError(null);
    await orchestrator.startSession();
  };

  const stopSession = async () => {
    await orchestrator.stopSession();
  };

  return {
    videoRef,
    canvasRef,
    videoContainerRef,
    isSessionActive: appState === 'active',
    currentSession,
    isCalibrating: appState === 'calibrating',
    calibrationProgress,
    countdown,
    error,
    isModelLoading,
    startSession,
    stopSession,
  };
}
