import { useEffect, useRef, useState } from "preact/hooks";
import { useSettings } from "../../hooks/use-settings";
import { SettingsData } from "@/domain/types/settings.types";
import { Icon } from "@/presentation/components/icon";
import { CloseButton } from "@/presentation/components/close-button";
import { ActionButton } from "@/presentation/components/action-button";
import { ScrollableContainer } from "@/presentation/components/scrollable-container";
import styles from "./settings-drawer.module.css";

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsDrawer({ isOpen, onClose }: SettingsDrawerProps) {
  const { settings, updateSettings, resetSettings, loadSettings } =
    useSettings();
  const previouslyOpen = useRef(false);

  // Single state object from domain settings
  const [formData, setFormData] = useState<SettingsData>(settings.toData());
  const [error, setError] = useState<string | null>(null);

  // Sync form data when settings change
  useEffect(() => {
    setFormData(settings.toData());
  }, [settings]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);

      // Reload settings when drawer opens to ensure fresh data
      if (!previouslyOpen.current) {
        loadSettings();
      }
      previouslyOpen.current = true;
    } else {
      previouslyOpen.current = false;
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, loadSettings]);

  const updateField = <K extends keyof SettingsData>(
    field: K,
    value: SettingsData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    try {
      setError(null);
      updateSettings(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    }
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset all settings to defaults?")) {
      try {
        resetSettings();
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to reset settings"
        );
      }
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={styles.backdrop}
      data-testid="drawer-backdrop"
      onClick={onClose}
    >
      <div
        role="dialog"
        className={styles.drawer}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>Settings</h2>
          <CloseButton onClick={onClose} />
        </div>

        <ScrollableContainer className={styles.content}>
          {error && <div className={styles.error}>{error}</div>}

          {/* Workout Section */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <Icon name="timer" className={styles.sectionIcon} />
              Workout
            </h3>
            <div className={styles.field}>
              <label htmlFor="startCountdown" className={styles.label}>
                Start Countdown (seconds)
              </label>
              <input
                id="startCountdown"
                type="number"
                min="0"
                value={formData.startCountdownSeconds}
                onChange={(e) =>
                  updateField(
                    "startCountdownSeconds",
                    parseInt((e.target as HTMLInputElement).value, 10) || 0
                  )
                }
                className={styles.input}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="autoStopTime" className={styles.label}>
                Auto-stop workout at (mm:ss)
              </label>
              <input
                id="autoStopTime"
                type="text"
                placeholder="mm:ss"
                value={formData.autoStopWorkoutTime || ""}
                onChange={(e) =>
                  updateField(
                    "autoStopWorkoutTime",
                    (e.target as HTMLInputElement).value || null
                  )
                }
                className={styles.input}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="stopCountdown" className={styles.label}>
                Stop countdown (seconds)
              </label>
              <input
                id="stopCountdown"
                type="number"
                min="0"
                placeholder="No countdown"
                value={formData.stopWorkoutCountdown ?? ""}
                onChange={(e) => {
                  const val = (e.target as HTMLInputElement).value;
                  updateField(
                    "stopWorkoutCountdown",
                    val ? parseInt(val, 10) : null
                  );
                }}
                className={styles.input}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="fps" className={styles.label}>
                Frame Rate (FPS)
              </label>
              <input
                id="fps"
                type="number"
                min="1"
                max="60"
                placeholder="12"
                value={formData.fps || ""}
                onChange={(e) => {
                  const val = (e.target as HTMLInputElement).value;
                  updateField("fps", val ? parseInt(val, 10) : 0);
                }}
                onBlur={(e) => {
                  // Apply default if field is empty or invalid on blur
                  const val = (e.target as HTMLInputElement).value;
                  if (!val || parseInt(val, 10) < 1) {
                    updateField("fps", 12);
                  }
                }}
                className={styles.input}
              />
            </div>
          </section>

          {/* Recording Section */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <Icon name="videocam" className={styles.sectionIcon} />
              Recording
            </h3>
            <div className={styles.field}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.recordVideo}
                  onChange={(e) =>
                    updateField(
                      "recordVideo",
                      (e.target as HTMLInputElement).checked
                    )
                  }
                  className={styles.checkbox}
                />
                <span>Record Video</span>
              </label>
            </div>
            <div className={styles.field}>
              <label htmlFor="videoFormat" className={styles.label}>
                Video Format
              </label>
              <select
                id="videoFormat"
                value={formData.videoFormat}
                onChange={(e) =>
                  updateField(
                    "videoFormat",
                    (e.target as HTMLSelectElement).value
                  )
                }
                className={styles.input}
              >
                <option value="webm">WebM</option>
                <option value="mp4">MP4</option>
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="videoQuality" className={styles.label}>
                Video Quality
              </label>
              <select
                id="videoQuality"
                value={formData.videoQuality}
                onChange={(e) =>
                  updateField(
                    "videoQuality",
                    (e.target as HTMLSelectElement).value
                  )
                }
                className={styles.input}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="veryhigh">Very High</option>
              </select>
            </div>
          </section>

          {/* Audio Feedback Section */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <Icon name="volume_up" className={styles.sectionIcon} />
              Audio Feedback
            </h3>
            <div className={styles.field}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.audioFeedbackEnabled}
                  onChange={(e) =>
                    updateField(
                      "audioFeedbackEnabled",
                      (e.target as HTMLInputElement).checked
                    )
                  }
                  className={styles.checkbox}
                />
                <span>Enable Audio Feedback</span>
              </label>
            </div>

            {formData.audioFeedbackEnabled && (
              <>
                <div className={styles.field}>
                  <label htmlFor="repInterval" className={styles.label}>
                    Beep every X reps
                  </label>
                  <input
                    id="repInterval"
                    type="number"
                    min="1"
                    value={formData.audioFeedbackRepInterval || ""}
                    onChange={(e) => {
                      const val = (e.target as HTMLInputElement).value;
                      updateField(
                        "audioFeedbackRepInterval",
                        val ? parseInt(val, 10) : null
                      );
                    }}
                    className={styles.input}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="timeInterval" className={styles.label}>
                    Beep every (mm:ss)
                  </label>
                  <input
                    id="timeInterval"
                    type="text"
                    placeholder="mm:ss"
                    value={formData.audioFeedbackTimeInterval || ""}
                    onChange={(e) =>
                      updateField(
                        "audioFeedbackTimeInterval",
                        (e.target as HTMLInputElement).value || null
                      )
                    }
                    className={styles.input}
                  />
                </div>
              </>
            )}
          </section>
        </ScrollableContainer>

        <div className={styles.footer}>
          <ActionButton
            onClick={handleReset}
            icon="refresh"
            variant="secondary"
          >
            Reset to Defaults
          </ActionButton>
          <ActionButton onClick={handleSave} icon="check" variant="primary">
            Save Settings
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
