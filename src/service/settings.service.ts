import { WorkoutSettings } from "../shared/types/workout-types";

/**
 * Pure settings service responsible for persisting workout settings
 * Uses localStorage for settings persistence
 */
export class SettingsService {
  private static readonly SETTINGS_KEY = "workout_settings";

  saveSettings(settings: WorkoutSettings): void {
    try {
      localStorage.setItem(
        SettingsService.SETTINGS_KEY,
        JSON.stringify(settings)
      );
    } catch (error) {
      console.warn("Failed to save settings:", error);
    }
  }

  loadSettings(): WorkoutSettings | null {
    try {
      const stored = localStorage.getItem(SettingsService.SETTINGS_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn("Failed to load settings:", error);
      return null;
    }
  }

  getDefaultSettings(): WorkoutSettings {
    return {
      countdownDuration: 3,
      sessionDuration: null,
      autoStopOnTimeLimit: false,
      beepInterval: 0,
      beepUnit: "reps",
      announcementInterval: 0,
      announcementUnit: "seconds",
    };
  }

  clearSettings(): void {
    try {
      localStorage.removeItem(SettingsService.SETTINGS_KEY);
    } catch (error) {
      console.warn("Failed to clear settings:", error);
    }
  }
}