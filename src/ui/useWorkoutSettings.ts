import { useRef, useEffect, useState } from "preact/hooks";
import { WorkoutSettings } from "./WorkoutSettings";
import { StorageService } from "../service/storage.service";
import { AudioFeedbackService } from "../service/audio-feedback.service";

export function useWorkoutSettings() {
  const [settings, setSettings] = useState<WorkoutSettings | null>(null);
  const storageServiceRef = useRef<StorageService>();
  const audioFeedbackServiceRef = useRef<AudioFeedbackService | null>(null);

  // Initialize storage service
  if (!storageServiceRef.current) {
    storageServiceRef.current = new StorageService();
  }

  const storageService = storageServiceRef.current;

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      await storageService.initialize();
      const savedSettings = storageService.loadSettings();
      const finalSettings =
        savedSettings || storageService.getDefaultSettings();
      setSettings(finalSettings);

      // Initialize audio feedback service with settings
      if (!audioFeedbackServiceRef.current) {
        audioFeedbackServiceRef.current = new AudioFeedbackService(
          finalSettings
        );
        await audioFeedbackServiceRef.current.initialize();
      }
    };

    loadSettings();
  }, []);

  const updateSettings = (newSettings: WorkoutSettings) => {
    setSettings(newSettings);
    storageService.saveSettings(newSettings);

    // Update audio feedback service
    if (audioFeedbackServiceRef.current) {
      audioFeedbackServiceRef.current.updateSettings(newSettings);
    }
  };

  const getAudioFeedbackService = (): AudioFeedbackService | null => {
    return audioFeedbackServiceRef.current;
  };

  // Countdown management using settings
  const getCountdownDuration = (): number => {
    return settings?.countdownDuration || 3;
  };

  return {
    settings,
    updateSettings,
    getAudioFeedbackService,
    getCountdownDuration,
    isSettingsLoaded: settings !== null,
  };
}
