import { create } from "zustand";
import { CameraService } from "../../service/camera.service";
import { AudioService } from "../../service/audio.service";
import { PredictionService } from "../../service/prediction.service";
import { RenderingService } from "../../service/rendering.service";
import { RepCountingService } from "../../service/rep-counting.service";
import { WorkoutSession } from "../types/workout-types";
import { PredictionAnalysisService } from "../../service/prediction-analysis.service";
import { StorageService } from "../../service/storage.service";
import { RecordingService } from "../../service/recording.service";
import { AudioFeedbackService } from "../../service/audio-feedback.service";
import { SettingsService } from "../../service/settings.service";
import { WorkoutSettings } from "../types/workout-types";
import { useWorkoutStore } from "./workout-store";

interface ServicesState {
  // Pure service instances
  cameraService: CameraService | null;
  audioService: AudioService | null;
  predictionService: PredictionService | null;
  renderingService: RenderingService | null;
  repCountingService: RepCountingService | null;
  analysisService: PredictionAnalysisService | null;
  storageService: StorageService | null;
  recordingService: RecordingService | null;
  audioFeedbackService: AudioFeedbackService | null;
  settingsService: SettingsService | null;

  // Coordination state
  animationFrameId: number | null;
  isProcessingActive: boolean;
  currentWorkoutId: string | null;
  sessionStartTime: number | null;
  sessionTimeoutId: number | null;
  sessionEndCountdownId: number | null;

  // Service status
  servicesInitialized: boolean;
  initializationError: string | null;

  // Actions
  initializeServices: () => Promise<void>;
  prepareCamera: (video: HTMLVideoElement, canvas: HTMLCanvasElement) => Promise<void>;
  startProcessingLoop: (video: HTMLVideoElement, canvas: HTMLCanvasElement) => void;
  stopProcessingLoop: () => void;
  startWorkoutSession: (video: HTMLVideoElement) => Promise<void>;
  stopWorkoutSession: () => Promise<WorkoutSession | null>;
  updateSettings: (settings: WorkoutSettings) => void;
  playCountdownBeep: () => Promise<void>;
  playStartBeep: () => Promise<void>;
  disposeServices: () => void;
  handleActiveFrame: (bestPrediction: any) => void;
  setupSessionTimer: (durationMs: number, startTime: number) => void;
  clearSessionTimers: () => void;
  handleSessionTimeout: () => void;
  startSessionEndCountdown: () => Promise<void>;
}

export const useServicesStore = create<ServicesState>((set, get) => ({
    // Initial state
    cameraService: null,
  audioService: null,
  predictionService: null,
  renderingService: null,
  repCountingService: null,
  analysisService: null,
  storageService: null,
  recordingService: null,
  audioFeedbackService: null,
  settingsService: null,
  animationFrameId: null,
  isProcessingActive: false,
  currentWorkoutId: null,
  sessionStartTime: null,
  sessionTimeoutId: null,
  sessionEndCountdownId: null,
  servicesInitialized: false,
  initializationError: null,

  initializeServices: async () => {
    try {
      set({ initializationError: null });

      // Initialize storage service
      const storageService = new StorageService();
      await storageService.initialize();

      // Initialize settings service and load settings
      const settingsService = new SettingsService();
      const savedSettings = settingsService.loadSettings();
      const defaultSettings = settingsService.getDefaultSettings();
      const finalSettings = savedSettings
        ? { ...defaultSettings, ...savedSettings }
        : defaultSettings;

      // Create all service instances
      const cameraService = new CameraService();
      const audioService = new AudioService();
      const predictionService = new PredictionService();
      const renderingService = new RenderingService();
      const repCountingService = new RepCountingService();
      const analysisService = new PredictionAnalysisService();
      const recordingService = new RecordingService();
      const audioFeedbackService = new AudioFeedbackService(finalSettings);

      // Initialize services that need async setup
      await Promise.all([
        predictionService.initialize(),
        audioFeedbackService.initialize(),
        audioService.initialize(),
      ]);

      // Audio feedback service is now pure - no callbacks needed

      // Update workout store with loaded settings and set model loading to false
      const workoutStore = useWorkoutStore.getState();
      workoutStore.updateSettings(finalSettings);
      workoutStore.setModelLoading(false);

      set({
        cameraService,
        audioService,
        predictionService,
        renderingService,
        repCountingService,
        analysisService,
        storageService,
        recordingService,
        audioFeedbackService,
        settingsService,
        servicesInitialized: true,
      });
    } catch (error) {
      // Set model loading to false even on error
      useWorkoutStore.getState().setModelLoading(false);
      
      set({
        initializationError: error instanceof Error ? error.message : "Unknown error",
        servicesInitialized: false,
      });
    }
  },

  prepareCamera: async (video: HTMLVideoElement, canvas: HTMLCanvasElement) => {
    const { cameraService } = get();
    if (!cameraService) throw new Error("Camera service not initialized");

    // Get canvas dimensions for camera setup
    const { width, height } = canvas.getBoundingClientRect();
    video.width = width;
    video.height = height;
    canvas.width = width;
    canvas.height = height;
    
    await cameraService.start(width, height, video);
    get().startProcessingLoop(video, canvas);
  },

  startProcessingLoop: (video: HTMLVideoElement, canvas: HTMLCanvasElement) => {
    const processFrame = () => {
      const state = get();
      if (!state.predictionService || !state.renderingService) return;

      const { bestPrediction } = state.predictionService.process(video);

      if (state.isProcessingActive) {
        get().handleActiveFrame(bestPrediction);
      }

      // Render frame
      const { width, height } = canvas.getBoundingClientRect();
      state.renderingService.render({
        source: video,
        target: canvas,
        score: bestPrediction.score,
        box: bestPrediction.box,
        keypoints: bestPrediction.keypoints,
        width,
        height,
      });

      const animationFrameId = requestAnimationFrame(processFrame);
      set({ animationFrameId });
    };

    processFrame();
  },

  stopProcessingLoop: () => {
    const { animationFrameId } = get();
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      set({ animationFrameId: null, isProcessingActive: false });
    }
  },

  startWorkoutSession: async (video: HTMLVideoElement) => {
    const {
      storageService,
      recordingService,
      repCountingService,
      analysisService,
      audioFeedbackService,
    } = get();

    if (!storageService || !recordingService || !repCountingService || !analysisService || !audioFeedbackService) {
      throw new Error("Services not initialized");
    }

    // Generate workout ID and create video writer
    const workoutId = storageService.generateWorkoutId();
    const videoWriter = await storageService.createVideoWriter(workoutId);

    // Setup analysis and start session
    analysisService.resetState();
    repCountingService.start();

    // Start recording
    const stream = video.srcObject as MediaStream;
    await recordingService.startRecording(workoutId, stream, videoWriter);

    // Start audio feedback session
    const session = repCountingService.getCurrentSession();
    if (session) {
      audioFeedbackService.startSession(session);
    }

    // Set up session duration management if specified
    const currentTime = Date.now();
    const settings = useWorkoutStore.getState().settings;
    
    if (settings?.sessionDuration) {
      get().setupSessionTimer(settings.sessionDuration * 1000, currentTime);
    }

    set({ 
      isProcessingActive: true,
      currentWorkoutId: workoutId,
      sessionStartTime: currentTime,
    });
  },

  stopWorkoutSession: async () => {
    const {
      recordingService,
      storageService,
      repCountingService,
      audioFeedbackService,
      cameraService,
      currentWorkoutId,
    } = get();

    if (!recordingService || !storageService || !repCountingService || !cameraService) {
      return null;
    }

    get().stopProcessingLoop();

    const session = repCountingService.stop();

    if (session && currentWorkoutId) {
      // Stop recording and get video size
      const { videoSize } = await recordingService.stopRecording();
      
      // Save workout data
      await storageService.saveWorkout(currentWorkoutId, session, videoSize);

      // End audio feedback session (manual stop)
      if (audioFeedbackService) {
        await audioFeedbackService.endSession(session, true);
      }
    } else if (audioFeedbackService) {
      // Stop audio feedback even if no session
      audioFeedbackService.stopSession();
    }

    cameraService.stop();
    
    // Clear session timers
    get().clearSessionTimers();
    
    set({ 
      currentWorkoutId: null,
      sessionStartTime: null,
    });
    
    return session;
  },

  updateSettings: (settings: WorkoutSettings) => {
    const { audioFeedbackService, settingsService } = get();
    
    if (audioFeedbackService) {
      audioFeedbackService.updateSettings(settings);
    }
    
    if (settingsService) {
      settingsService.saveSettings(settings);
    }
  },

  playCountdownBeep: async () => {
    const { audioFeedbackService } = get();
    if (audioFeedbackService) {
      await audioFeedbackService.playCountdownBeep();
    }
  },

  playStartBeep: async () => {
    const { audioFeedbackService } = get();
    if (audioFeedbackService) {
      await audioFeedbackService.playStartBeep();
    }
  },

  disposeServices: () => {
    const {
      predictionService,
      audioFeedbackService,
      recordingService,
      cameraService,
    } = get();

    get().stopProcessingLoop();
    get().clearSessionTimers();

    if (predictionService) predictionService.dispose();
    if (audioFeedbackService) audioFeedbackService.dispose();
    if (recordingService) recordingService.dispose();
    if (cameraService) cameraService.stop();

    set({
      cameraService: null,
      audioService: null,
      predictionService: null,
      renderingService: null,
      repCountingService: null,
      analysisService: null,
      storageService: null,
      recordingService: null,
      audioFeedbackService: null,
      settingsService: null,
      servicesInitialized: false,
    });
  },

  // Helper method for frame processing
  handleActiveFrame: (bestPrediction: any) => {
    const { analysisService, repCountingService, audioFeedbackService } = get();
    if (!analysisService || !repCountingService) return;

    const repDetection = analysisService.analyzeForRep(bestPrediction);

    if (repDetection.detected) {
      repCountingService.addRep(repDetection.armType, repDetection.timestamp);
    }

    const session = repCountingService.getCurrentSession();

    if (session) {
      // Handle audio feedback for session updates
      if (audioFeedbackService) {
        audioFeedbackService.handleSessionUpdate(session);
      }

      // Update workout store
      useWorkoutStore.getState().updateSession({ ...session });
    } else {
      useWorkoutStore.getState().updateSession(null);
    }
  },

  setupSessionTimer: (durationMs: number, startTime: number) => {
    const settings = useWorkoutStore.getState().settings;
    if (!settings) return;

    // Calculate remaining time from session start
    const currentTime = Date.now();
    const elapsedTime = currentTime - startTime;
    const remainingTime = Math.max(0, durationMs - elapsedTime);
    
    // Set up countdown warning 3 seconds before end
    if (remainingTime > 3000) {
      const sessionEndCountdownId = window.setTimeout(() => {
        get().startSessionEndCountdown();
      }, remainingTime - 3000);
      
      set({ sessionEndCountdownId });
    } else if (remainingTime > 0) {
      // Less than 3 seconds left, start countdown immediately
      get().startSessionEndCountdown();
    }
    
    // Set up final timeout
    const sessionTimeoutId = window.setTimeout(() => {
      get().handleSessionTimeout();
    }, remainingTime);
    
    set({ sessionTimeoutId });
  },

  clearSessionTimers: () => {
    const { sessionTimeoutId, sessionEndCountdownId } = get();
    
    if (sessionTimeoutId) {
      clearTimeout(sessionTimeoutId);
    }
    
    if (sessionEndCountdownId) {
      clearTimeout(sessionEndCountdownId);
    }
    
    set({ 
      sessionTimeoutId: null,
      sessionEndCountdownId: null,
    });
  },

  startSessionEndCountdown: async () => {
    const { audioFeedbackService } = get();
    
    let count = 3;
    useWorkoutStore.getState().setSessionEndCountdown(count);
    
    // Play first countdown beep
    if (audioFeedbackService) {
      await audioFeedbackService.playCountdownBeep();
    }
    
    const countdownInterval = setInterval(async () => {
      count--;
      if (count > 0) {
        useWorkoutStore.getState().setSessionEndCountdown(count);
        if (audioFeedbackService) {
          await audioFeedbackService.playCountdownBeep();
        }
      } else {
        useWorkoutStore.getState().setSessionEndCountdown(null);
        clearInterval(countdownInterval);
      }
    }, 1000);
  },

  handleSessionTimeout: async () => {
    const { audioFeedbackService } = get();
    const settings = useWorkoutStore.getState().settings;
    
    // Clear countdown UI
    useWorkoutStore.getState().setSessionEndCountdown(null);
    
    if (settings?.autoStopOnTimeLimit) {
      // Auto-stop the session
      await get().stopWorkoutSession();
    } else {
      // Just play final beep for time limit reached
      if (audioFeedbackService) {
        await audioFeedbackService.playSessionEndFinalBeep();
      }
    }
  },
}));