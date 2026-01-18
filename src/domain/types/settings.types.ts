/**
 * Domain types for application settings.
 */
export interface SettingsData {
  // Workout
  startCountdownSeconds: number;
  autoStopWorkoutTime: string | null; // format: "mm:ss"
  stopWorkoutCountdown: number | null;
  fps: number; // frames per second (1-60)

  // Recording
  recordVideo: boolean;
  videoFormat: string; // "webm" or "mp4"
  videoQuality: string; // "low", "medium", "high", "veryhigh"

  // Audio Feedback
  audioFeedbackEnabled: boolean;
  audioFeedbackRepInterval: number | null; // every X reps
  audioFeedbackTimeInterval: string | null; // format: "mm:ss"
}

export const DEFAULT_SETTINGS: SettingsData = {
  startCountdownSeconds: 5,
  autoStopWorkoutTime: null,
  stopWorkoutCountdown: null,
  fps: 12,
  recordVideo: true,
  videoFormat: "webm",
  videoQuality: "medium",
  audioFeedbackEnabled: true,
  audioFeedbackRepInterval: null,
  audioFeedbackTimeInterval: null,
};

// Video quality bitrates
export const VIDEO_QUALITY_BITRATES: Record<string, number> = {
  low: 1000000,
  medium: 2500000,
  high: 5000000,
  veryhigh: 8000000,
};
