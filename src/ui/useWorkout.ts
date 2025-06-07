import { useRef, useEffect, useState } from "preact/hooks";
import { CameraService } from "../service/camera.service";
import { PredictionService } from "../service/prediction.service";
import { RenderingService } from "../service/rendering.service";
import { WorkoutService, WorkoutSession } from "../service/workout.service";
import { StorageService } from "../service/storage.service";
import { CalibrationService } from "../service/calibration.service";

export function useWorkout() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isSessionActiveRef = useRef(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [currentSession, setCurrentSession] = useState<WorkoutSession | null>(
    null
  );
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const shouldStartSessionAfterCalibrationRef = useRef(false);
  const needsArmStateInitializationRef = useRef(false);
  const [services] = useState(() => {
    const calibration = new CalibrationService();
    return {
      camera: new CameraService(),
      prediction: new PredictionService(),
      rendering: new RenderingService(),
      workout: new WorkoutService(calibration),
      storage: new StorageService(),
      calibration,
    };
  });

  useEffect(() => {
    initializeServices();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      services.camera.stop();
      services.prediction.dispose();
    };
  }, []);

  const initializeServices = async () => {
    try {
      await services.prediction.initialize();
      await services.storage.initialize();
    } catch (error) {
      console.error("Failed to initialize services:", error);
    }
  };

  const startPoseDetection = () => {
    const detectPoses = () => {
      if (
        !videoRef.current ||
        !canvasRef.current ||
        !videoContainerRef.current ||
        !isSessionActiveRef.current
      )
        return;

      try {
        const { bestPrediction } = services.prediction.process(
          videoRef.current
        );
        
        // Handle calibration or workout processing
        if (services.calibration.isCalibrationActive()) {
          services.calibration.processPose(bestPrediction);
          setCalibrationProgress(services.calibration.getCalibrationProgress());
          
          // Check if calibration is complete
          if (services.calibration.isCalibrated() && !services.calibration.isCalibrationActive()) {
            setIsCalibrating(false);
            
            // Auto-start session if requested
            if (shouldStartSessionAfterCalibrationRef.current) {
              shouldStartSessionAfterCalibrationRef.current = false;
              // Start countdown before workout session
              startCountdown();
            }
          }
        } else {
          // Initialize arm states from current pose if needed (right after calibration)
          if (needsArmStateInitializationRef.current) {
            services.workout.initializeArmStatesFromCurrentPose(bestPrediction);
            needsArmStateInitializationRef.current = false;
          }
          
          services.workout.processPose(bestPrediction);
          const session = services.workout.getCurrentSession();
          setCurrentSession(session ? { ...session } : null);
        }

        const containerRect = videoContainerRef.current.getBoundingClientRect();

        services.rendering.render({
          source: videoRef.current,
          target: canvasRef.current,
          score: bestPrediction.score,
          box: bestPrediction.box,
          keypoints: bestPrediction.keypoints,
          width: containerRect.width,
          height: containerRect.height,
        });
      } catch (error) {
        console.error("Pose detection error:", error);
      }

      if (isSessionActiveRef.current) {
        animationFrameRef.current = requestAnimationFrame(detectPoses);
      }
    };

    detectPoses();
  };


  const startCountdown = () => {
    let count = 3;
    setCountdown(count);
    
    const countdownInterval = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
      } else {
        clearInterval(countdownInterval);
        // Set session active immediately, then clear countdown and start session
        setIsSessionActive(true);
        setCountdown(null);
        startWorkoutSessionAfterCalibration();
      }
    }, 1000);
  };

  const startWorkoutSessionAfterCalibration = async () => {
    try {
      if (!services.workout.isCalibrated()) {
        console.error("Calibration not complete");
        return;
      }
      
      services.workout.startSession();
      
      // Flag to initialize arm states from current pose on next frame
      needsArmStateInitializationRef.current = true;

      const stream = videoRef.current!.srcObject as MediaStream;
      await services.storage.startRecording(stream);

      // Note: isSessionActive is already set to true in countdown
      // Note: startPoseDetection is already running from calibration
    } catch (error) {
      console.error("Failed to start workout session:", error);
    }
  };

  const startSession = async () => {
    if (!videoRef.current || !videoContainerRef.current) return;

    try {
      // Start camera and pose detection
      const containerRect = videoContainerRef.current.getBoundingClientRect();
      const width = containerRect.width;
      const height = containerRect.height;
      await services.camera.start(width, height, videoRef.current);

      // Reset calibration and start calibration flow
      services.calibration.reset();
      services.calibration.startCalibration();
      
      shouldStartSessionAfterCalibrationRef.current = true;
      isSessionActiveRef.current = true;
      setIsCalibrating(true);
      setCalibrationProgress(0);
      startPoseDetection();
    } catch (error) {
      console.error("Failed to start session:", error);
    }
  };

  const stopSession = async () => {
    try {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      // Stop workout session if active
      const session = services.workout.endSession();
      if (session) {
        await services.storage.stopRecording(session);
      }

      // Reset calibration state
      services.calibration.reset();

      services.camera.stop();
      isSessionActiveRef.current = false;
      setIsSessionActive(false);
      setIsCalibrating(false);
      setCalibrationProgress(0);
      setCountdown(null);
      shouldStartSessionAfterCalibrationRef.current = false;
      needsArmStateInitializationRef.current = false;
      setCurrentSession(null);
    } catch (error) {
      console.error("Failed to stop session:", error);
    }
  };

  return {
    videoRef,
    canvasRef,
    videoContainerRef,
    isSessionActive,
    currentSession,
    isCalibrating,
    calibrationProgress,
    countdown,
    startSession,
    stopSession,
  };
}
