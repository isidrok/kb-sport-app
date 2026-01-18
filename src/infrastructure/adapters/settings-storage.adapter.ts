import { SettingsEntity } from "@/domain/entities/settings-entity";
import { SettingsData, DEFAULT_SETTINGS } from "@/domain/types/settings.types";

const STORAGE_KEY = "kb-sport-app-settings";

/**
 * Settings storage adapter using LocalStorage.
 *
 * Handles all persistence concerns for application settings including:
 * - Loading settings from LocalStorage
 * - Saving settings to LocalStorage
 * - Resetting to default values
 */
export class SettingsStorageAdapter {
  /**
   * Load settings from LocalStorage
   * Returns a SettingsEntity with loaded data or defaults if not found
   */
  loadSettings(): SettingsEntity {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return new SettingsEntity(DEFAULT_SETTINGS);
      }

      const data = JSON.parse(stored) as SettingsData;
      return new SettingsEntity(data);
    } catch (error) {
      console.error("Failed to load settings from LocalStorage:", error);
      return new SettingsEntity(DEFAULT_SETTINGS);
    }
  }

  /**
   * Save settings to LocalStorage
   */
  saveSettings(settings: SettingsEntity): void {
    try {
      const data = settings.toData();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save settings to LocalStorage:", error);
      throw error;
    }
  }

  /**
   * Reset settings to defaults
   */
  resetToDefaults(): SettingsEntity {
    try {
      localStorage.removeItem(STORAGE_KEY);
      const defaultSettings = new SettingsEntity(DEFAULT_SETTINGS);
      this.saveSettings(defaultSettings);
      return defaultSettings;
    } catch (error) {
      console.error("Failed to reset settings:", error);
      throw error;
    }
  }

  /**
   * Get current settings data (convenience method)
   */
  getSettings(): SettingsData {
    return this.loadSettings().toData();
  }
}

// Export singleton instance
export const settingsStorageAdapter = new SettingsStorageAdapter();
