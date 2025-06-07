import { useRef, useEffect, useState } from 'preact/hooks';
import { CameraService } from '../service/camera.service';
import { PredictionService } from '../service/prediction.service';
import { RenderingService } from '../service/rendering.service';
import { WorkoutService, WorkoutSession } from '../service/workout.service';
import { StorageService } from '../service/storage.service';

export function useWorkout() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isSessionActiveRef = useRef(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [currentSession, setCurrentSession] = useState<WorkoutSession | null>(null);
  const [services] = useState(() => ({
    camera: new CameraService(),
    prediction: new PredictionService(),
    rendering: new RenderingService(),
    workout: new WorkoutService(),
    storage: new StorageService(),
  }));

  useEffect(() => {
    initializeServices();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      services.camera.stop();
    };
  }, []);

  const initializeServices = async () => {
    try {
      await services.prediction.initialize();
      await services.storage.initialize();
    } catch (error) {
      console.error('Failed to initialize services:', error);
    }
  };

  const startPoseDetection = () => {
    const detectPoses = async () => {
      if (!videoRef.current || !canvasRef.current || !videoContainerRef.current || !isSessionActiveRef.current) return;

      try {
        const { bestPrediction } = await services.prediction.process(videoRef.current);
        console.log('useWorkout: Prediction received:', bestPrediction.score, 'keypoints count:', bestPrediction.keypoints.length);
        services.workout.processPose(bestPrediction);
        setCurrentSession(services.workout.getCurrentSession());
        
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
        console.error('Pose detection error:', error);
      }

      if (isSessionActiveRef.current) {
        animationFrameRef.current = requestAnimationFrame(detectPoses);
      }
    };

    detectPoses();
  };

  const startSession = async () => {
    if (!videoRef.current || !videoContainerRef.current) return;

    try {
      const containerRect = videoContainerRef.current.getBoundingClientRect();
      const width = containerRect.width;
      const height = containerRect.height;
      
      await services.camera.start(width, height, videoRef.current);
      services.workout.startSession();
      
      const stream = videoRef.current.srcObject as MediaStream;
      await services.storage.startRecording(stream);
      
      isSessionActiveRef.current = true;
      setIsSessionActive(true);
      startPoseDetection();
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };

  const stopSession = async () => {
    try {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      const session = services.workout.endSession();
      if (session) {
        await services.storage.stopRecording(session);
      }
      
      services.camera.stop();
      isSessionActiveRef.current = false;
      setIsSessionActive(false);
      setCurrentSession(null);
    } catch (error) {
      console.error('Failed to stop session:', error);
    }
  };

  return {
    videoRef,
    canvasRef,
    videoContainerRef,
    isSessionActive,
    currentSession,
    startSession,
    stopSession,
  };
}