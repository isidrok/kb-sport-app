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
  const [formData, setFormData] = useState<SettingsData>(settings.toData());

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

  const handleSave = () => {
    updateSettings(formData);
    onClose();
  };

  const handleReset = () => {
      resetSettings();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
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
                max="30"
                value={formData.startCountdownSeconds}
                onInput={(e) =>
                  setFormData({
                    ...formData,
                    startCountdownSeconds: Number(
                      (e.target as HTMLInputElement).value
                    ),
                  })
                }
                className={styles.input}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="autoStop" className={styles.label}>
                Auto-stop at (mm:ss)
              </label>
              <input
                id="autoStop"
                type="text"
                placeholder="mm:ss (optional)"
                value={formData.autoStopWorkoutTime || ""}
                onInput={(e) =>
                  setFormData({
                    ...formData,
                    autoStopWorkoutTime:
                      (e.target as HTMLInputElement).value || null,
                  })
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
                onInput={(e) =>
                  setFormData({
                    ...formData,
                    stopWorkoutCountdown:
                      (e.target as HTMLInputElement).value
                        ? Number((e.target as HTMLInputElement).value)
                        : null,
                  })
                }
                className={styles.input}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="fps" className={styles.label}>
                FPS (1-60)
              </label>
              <input
                id="fps"
                type="number"
                min="1"
                max="60"
                value={formData.fps}
                onInput={(e) =>
                  setFormData({
                    ...formData,
                    fps: Number((e.target as HTMLInputElement).value),
                  })
                }
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
                    setFormData({
                      ...formData,
                      recordVideo: (e.target as HTMLInputElement).checked,
                    })
                  }
                  className={styles.checkbox}
                />
                <span>Record Video</span>
              </label>
            </div>

            <div className={styles.field}>
              <label htmlFor="videoFormat" className={styles.label}>
                Format
              </label>
              <select
                id="videoFormat"
                value={formData.videoFormat}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    videoFormat: (e.target as HTMLSelectElement).value,
                  })
                }
                className={styles.input}
              >
                <option value="webm">WebM</option>
                <option value="mp4">MP4</option>
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="videoQuality" className={styles.label}>
                Quality
              </label>
              <select
                id="videoQuality"
                value={formData.videoQuality}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    videoQuality: (e.target as HTMLSelectElement).value,
                  })
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
                    setFormData({
                      ...formData,
                      audioFeedbackEnabled: (e.target as HTMLInputElement)
                        .checked,
                    })
                  }
                  className={styles.checkbox}
                />
                <span>Enable Audio</span>
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
                    placeholder="Optional"
                    value={formData.audioFeedbackRepInterval ?? ""}
                    onInput={(e) =>
                      setFormData({
                        ...formData,
                        audioFeedbackRepInterval:
                          (e.target as HTMLInputElement).value
                            ? Number((e.target as HTMLInputElement).value)
                            : null,
                      })
                    }
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
                    placeholder="mm:ss (optional)"
                    value={formData.audioFeedbackTimeInterval || ""}
                    onInput={(e) =>
                      setFormData({
                        ...formData,
                        audioFeedbackTimeInterval:
                          (e.target as HTMLInputElement).value || null,
                      })
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
            Reset
          </ActionButton>
          <ActionButton onClick={handleSave} icon="check" variant="primary">
            Save
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
