/**
 * Domain types for application settings.
 * These types define the core data structures used for settings persistence.
 */

/**
 * Settings data for storage serialization
 */
export interface SettingsData {
  // Workout Section
  startCountdownSeconds: number;
  autoStopWorkoutTime: string | null; // format: "mm:ss"
  stopWorkoutCountdown: number | null; // seconds, null = no countdown
  fps: number; // frames per second for pose detection (1-60)

  // Recording Section
  recordVideo: boolean;
  videoFormat: string; // "webm" or "mp4"
  videoQuality: string; // "low", "medium", "high", "veryhigh"

  // Audio Feedback
  audioFeedbackEnabled: boolean;
  audioFeedbackRepInterval: number | null; // every X reps
  audioFeedbackTimeInterval: string | null; // format: "mm:ss"
}

/**
 * Default settings values
 */
export const DEFAULT_SETTINGS: SettingsData = {
  // Workout
  startCountdownSeconds: 5,
  autoStopWorkoutTime: null,
  stopWorkoutCountdown: null,
  fps: 20,

  // Recording
  recordVideo: true,
  videoFormat: "webm",
  videoQuality: "medium",

  // Audio Feedback
  audioFeedbackEnabled: true,
  audioFeedbackRepInterval: null,
  audioFeedbackTimeInterval: null,
};

// Video quality to bitrate mapping (used by infrastructure layer)
export const VIDEO_QUALITY_BITRATES: Record<string, number> = {
  low: 1000000, // 1 Mbps
  medium: 2500000, // 2.5 Mbps
  high: 5000000, // 5 Mbps
  veryhigh: 8000000, // 8 Mbps
};
