import { useRef, useEffect, useState } from "preact/hooks";
import { WorkoutOrchestratorService, WorkoutState } from "../service/workout-orchestrator.service";

export function useWorkout() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [workoutData, setWorkoutData] = useState<WorkoutState>({
    appState: 'idle',
    countdown: null,
    session: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(true);

  const workoutServiceRef = useRef<WorkoutOrchestratorService>();

  if (!workoutServiceRef.current) {
    workoutServiceRef.current = new WorkoutOrchestratorService({
      onChange: setWorkoutData
    });
  }

  const workoutService = workoutServiceRef.current;

  useEffect(() => {
    const initialize = async () => {
      try {
        await workoutService.initialize();
        setIsModelLoading(false);
      } catch (error) {
        console.error("Failed to initialize workout service:", error);
        setError("Failed to load pose detection model. Please refresh the page.");
        setIsModelLoading(false);
      }
    };

    initialize();

    return () => {
      workoutService.dispose();
    };
  }, []);

  const startSession = async () => {
    setError(null);
    try {
      await workoutService.start(videoRef.current!, canvasRef.current!);
    } catch (error) {
      console.error("Failed to start session:", error);
      setError("Failed to start workout session. Please try again.");
    }
  };

  const stopSession = async () => {
    try {
      await workoutService.stop();
    } catch (error) {
      console.error("Failed to stop session:", error);
      setError("Failed to stop workout session.");
    }
  };

  return {
    videoRef,
    canvasRef,
    appState: workoutData.appState,
    isSessionActive: workoutData.appState === 'active',
    currentSession: workoutData.session,
    countdown: workoutData.countdown,
    error,
    isModelLoading,
    startSession,
    stopSession,
  };
}
