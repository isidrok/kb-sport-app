import { useRef, useEffect, useState } from "preact/hooks";
import { WorkoutOrchestratorService } from "../service/workout-orchestrator.service";
import { WorkoutSession } from "../service/rep-counting.service";

export function useWorkout() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [currentSession, setCurrentSession] = useState<WorkoutSession | null>(null);
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  
  const countdownIntervalRef = useRef<number | null>(null);

  const workoutServiceRef = useRef<WorkoutOrchestratorService>();

  if (!workoutServiceRef.current) {
    workoutServiceRef.current = new WorkoutOrchestratorService(setCurrentSession);
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
      // Clean up countdown interval
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      workoutService.dispose();
    };
  }, []);

  const startCountdown = () => {
    let count = 3;
    setCountdown(count);

    countdownIntervalRef.current = window.setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
      } else {
        setCountdown(null);
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        // Start the actual workout
        startWorkout();
      }
    }, 1000);
  };

  const startSession = async () => {
    setError(null);
    try {
      // Prepare camera and start processing loop
      await workoutService.prepareCamera(videoRef.current!, canvasRef.current!);
      // Start countdown in UI
      startCountdown();
    } catch (error) {
      console.error("Failed to start session:", error);
      setError("Failed to start workout session. Please try again.");
    }
  };

  const startWorkout = async () => {
    try {
      await workoutService.startWorkout(videoRef.current!);
      setIsWorkoutActive(true);
    } catch (error) {
      console.error("Failed to start workout:", error);
      setError("Failed to start workout. Please try again.");
      setCountdown(null);
    }
  };

  const stopSession = async () => {
    // Clear countdown if running
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
      setCountdown(null);
    }
    
    try {
      await workoutService.stop();
      setIsWorkoutActive(false);
    } catch (error) {
      console.error("Failed to stop session:", error);
      setError("Failed to stop workout session.");
    }
  };

  return {
    videoRef,
    canvasRef,
    isSessionActive: isWorkoutActive,
    currentSession,
    countdown,
    error,
    isModelLoading,
    startSession,
    stopSession,
  };
}
