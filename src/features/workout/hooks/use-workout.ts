import { useRef, useEffect, useState } from "preact/hooks";
import { WorkoutOrchestratorService } from "../../../service/workout-orchestrator.service";
import { WorkoutSession } from "../../../service/rep-counting.service";
import { WorkoutSettings } from "../../../shared/types/workout-types";
import { StorageService } from "../../../service/storage.service";

export function useWorkout() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [currentSession, setCurrentSession] = useState<WorkoutSession | null>(null);
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [sessionEndCountdown, setSessionEndCountdown] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [settings, setSettings] = useState<WorkoutSettings | null>(null);
  
  const countdownIntervalRef = useRef<number | null>(null);
  const workoutServiceRef = useRef<WorkoutOrchestratorService | null>(null);
  const storageServiceRef = useRef<StorageService>();

  // Initialize storage service
  if (!storageServiceRef.current) {
    storageServiceRef.current = new StorageService();
  }

  const storageService = storageServiceRef.current;

  useEffect(() => {
    const initialize = async () => {
      try {
        // Initialize storage and load settings
        await storageService.initialize();
        const savedSettings = storageService.loadSettings();
        const defaultSettings = storageService.getDefaultSettings();
        
        // Merge saved settings with defaults to ensure all fields are present
        const finalSettings = savedSettings ? {
          ...defaultSettings,
          ...savedSettings
        } : defaultSettings;
        
        // Settings loaded and merged with defaults
        
        setSettings(finalSettings);

        // Create workout service with settings
        workoutServiceRef.current = new WorkoutOrchestratorService(
          finalSettings,
          (session) => setCurrentSession(session),
          (countdown) => setSessionEndCountdown(countdown),
          () => {
            // Auto-stop callback
            if (workoutServiceRef.current) {
              workoutServiceRef.current.stop();
              setIsWorkoutActive(false);
            }
          }
        );

        // Initialize workout service
        await workoutServiceRef.current.initialize();
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
      if (workoutServiceRef.current) {
        workoutServiceRef.current.dispose();
      }
    };
  }, []);

  const startCountdown = (duration: number) => {
    if (!workoutServiceRef.current) return;
    
    let count = duration;
    if (count === 0) {
      // No countdown, start immediately
      startWorkout();
      return;
    }

    setCountdown(count);
    
    // Play initial countdown beep for the first number
    if (workoutServiceRef.current) {
      workoutServiceRef.current.playCountdownBeep();
    }

    countdownIntervalRef.current = window.setInterval(async () => {
      count--;
      if (count > 0) {
        setCountdown(count);
        // Play countdown beep for each remaining number
        if (workoutServiceRef.current) {
          await workoutServiceRef.current.playCountdownBeep();
        }
      } else {
        setCountdown(null);
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        
        // Play start beep and start workout
        if (workoutServiceRef.current) {
          await workoutServiceRef.current.playStartBeep();
        }
        startWorkout();
      }
    }, 1000);
  };

  const startSession = async () => {
    if (!workoutServiceRef.current || !settings) return;
    
    // Clear previous session data when starting new workout
    setCurrentSession(null);
    setError(null);
    
    try {
      // Prepare camera and start processing loop
      await workoutServiceRef.current.prepareCamera(videoRef.current!, canvasRef.current!);
      // Start countdown based on settings
      const countdownDuration = settings.countdownDuration || 0;
      startCountdown(countdownDuration);
    } catch (error) {
      console.error("Failed to start session:", error);
      setError("Failed to start workout session. Please try again.");
    }
  };

  const startWorkout = async () => {
    if (!workoutServiceRef.current) return;
    
    try {
      await workoutServiceRef.current.startWorkout(videoRef.current!);
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
    
    if (!workoutServiceRef.current) return;
    
    try {
      await workoutServiceRef.current.stop();
      setIsWorkoutActive(false);
      // Keep session data visible for user to see results
    } catch (error) {
      console.error("Failed to stop session:", error);
      setError("Failed to stop workout session.");
    }
  };

  const updateSettings = (newSettings: WorkoutSettings) => {
    setSettings(newSettings);
    storageService.saveSettings(newSettings);
    
    // Update workout service if it exists
    if (workoutServiceRef.current) {
      workoutServiceRef.current.updateSettings(newSettings);
    }
  };

  return {
    videoRef,
    canvasRef,
    isSessionActive: isWorkoutActive,
    currentSession,
    countdown,
    sessionEndCountdown,
    error,
    isModelLoading,
    settings,
    isSettingsLoaded: settings !== null,
    startSession,
    stopSession,
    updateSettings,
    // Audio feedback status methods
    isAudioAvailable: () => workoutServiceRef.current?.isAudioAvailable() ?? false,
    isSpeechAvailable: () => workoutServiceRef.current?.isSpeechAvailable() ?? false,
  };
}
