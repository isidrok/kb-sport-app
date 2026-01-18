import { useState, useCallback } from "preact/hooks";
import { SettingsEntity } from "@/domain/entities/settings-entity";
import { settingsStorageAdapter } from "@/infrastructure/adapters/settings-storage.adapter";
import { SettingsData } from "@/domain/types/settings.types";

export interface UseSettingsReturn {
  settings: SettingsEntity;
  isLoading: boolean;
  loadSettings: () => void;
  updateSettings: (updates: Partial<SettingsData>) => void;
  resetSettings: () => void;
}

export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<SettingsEntity>(
    settingsStorageAdapter.loadSettings()
  );
  const [isLoading, setIsLoading] = useState(false);

  const loadSettings = useCallback(() => {
    setIsLoading(true);
    const loadedSettings = settingsStorageAdapter.loadSettings();
    setSettings(loadedSettings);
    setIsLoading(false);
  }, []);

  const updateSettings = useCallback(
    (updates: Partial<SettingsData>) => {
      try {
        // Create new settings entity with updates
        const currentData = settings.toData();
        const newSettings = new SettingsEntity({ ...currentData, ...updates });
        
        // Save to storage
        settingsStorageAdapter.saveSettings(newSettings);
        
        // Update state
        setSettings(newSettings);
      } catch (error) {
        console.error("Failed to update settings:", error);
        throw error;
      }
    },
    [settings]
  );

  const resetSettings = useCallback(() => {
    try {
      const defaultSettings = settingsStorageAdapter.resetToDefaults();
      setSettings(defaultSettings);
    } catch (error) {
      console.error("Failed to reset settings:", error);
      throw error;
    }
  }, []);

  return {
    settings,
    isLoading,
    loadSettings,
    updateSettings,
    resetSettings,
  };
}
