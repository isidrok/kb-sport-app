import { create } from "zustand";
import { WorkoutSession } from "../types/workout-types";
import { WorkoutSettings } from "../types/workout-types";

interface WorkoutState {
  // Business State
  currentSession: WorkoutSession | null;
  isSessionActive: boolean;
  settings: WorkoutSettings | null;

  // UI State
  countdown: number | null;
  sessionEndCountdown: number | null;
  error: string | null;
  isModelLoading: boolean;
  isSettingsLoaded: boolean;

  // Audio status
  isAudioAvailable: boolean;
  isSpeechAvailable: boolean;

  // Actions
  updateSession: (session: WorkoutSession | null) => void;
  updateSettings: (settings: WorkoutSettings) => void;
  setCountdown: (countdown: number | null) => void;
  setSessionEndCountdown: (countdown: number | null) => void;
  setError: (error: string | null) => void;
  setModelLoading: (loading: boolean) => void;
  setSessionActive: (active: boolean) => void;
  setSettingsLoaded: (loaded: boolean) => void;
  setAudioAvailable: (available: boolean) => void;
  setSpeechAvailable: (available: boolean) => void;
  resetSession: () => void;
}

export const useWorkoutStore = create<WorkoutState>((set) => ({
  // Initial state
  currentSession: null,
  isSessionActive: false,
  settings: null,
  countdown: null,
  sessionEndCountdown: null,
  error: null,
  isModelLoading: true,
  isSettingsLoaded: false,
  isAudioAvailable: false,
  isSpeechAvailable: false,

  // Actions
  updateSession: (session) => set({ currentSession: session }),
  updateSettings: (settings) => set({ settings, isSettingsLoaded: true }),
  setCountdown: (countdown) => set({ countdown }),
  setSessionEndCountdown: (sessionEndCountdown) => set({ sessionEndCountdown }),
  setError: (error) => set({ error }),
  setModelLoading: (isModelLoading) => set({ isModelLoading }),
  setSessionActive: (isSessionActive) => set({ isSessionActive }),
  setSettingsLoaded: (isSettingsLoaded) => set({ isSettingsLoaded }),
  setAudioAvailable: (isAudioAvailable) => set({ isAudioAvailable }),
  setSpeechAvailable: (isSpeechAvailable) => set({ isSpeechAvailable }),
  resetSession: () => set({ 
    currentSession: null, 
    isSessionActive: false, 
    countdown: null, 
    sessionEndCountdown: null,
    error: null 
  }),
}));

// Selector hooks for common state combinations
export const useWorkoutSession = () => useWorkoutStore((state) => ({
  session: state.currentSession,
  isActive: state.isSessionActive,
}));

export const useWorkoutCountdown = () => useWorkoutStore((state) => ({
  countdown: state.countdown,
  sessionEndCountdown: state.sessionEndCountdown,
}));

export const useWorkoutStatus = () => useWorkoutStore((state) => ({
  error: state.error,
  isModelLoading: state.isModelLoading,
  isSettingsLoaded: state.isSettingsLoaded,
}));

export const useWorkoutSettings = () => useWorkoutStore((state) => state.settings);

export const useWorkoutAudio = () => useWorkoutStore((state) => ({
  isAudioAvailable: state.isAudioAvailable,
  isSpeechAvailable: state.isSpeechAvailable,
}));