import { useState, useEffect, useRef } from 'preact/hooks';
import styles from './WorkoutSettings.module.css';

export interface WorkoutSettings {
  countdownDuration: number;
  sessionDuration: number | null; // null for unlimited
  beepInterval: number; // beep every X units (0 = disabled)
  beepUnit: 'reps' | 'seconds'; // unit for beeps
  announcementInterval: number; // announce every X units (0 = disabled)
  announcementUnit: 'reps' | 'minutes'; // unit for announcements
}

interface WorkoutSettingsProps {
  settings: WorkoutSettings;
  onSettingsChange: (settings: WorkoutSettings) => void;
  disabled?: boolean;
}

export function WorkoutSettingsMenu({ 
  settings, 
  onSettingsChange, 
  disabled = false 
}: WorkoutSettingsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const handleSettingChange = (key: keyof WorkoutSettings, value: number | null) => {
    onSettingsChange({
      ...settings,
      [key]: value,
    });
  };

  // Handle clicking outside to close modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded]);

  return (
    <>
      <button
        className={styles.settingsToggle}
        onClick={() => setIsExpanded(!isExpanded)}
        disabled={disabled}
        title="Workout Settings"
      >
        ⚙️
      </button>

      {isExpanded && (
        <div className={styles.modalOverlay}>
          <div className={styles.settingsPanel} ref={modalRef}>
            <div className={styles.settingsHeader}>
              <h3>Workout Settings</h3>
              <button
                className={styles.closeButton}
                onClick={() => setIsExpanded(false)}
                title="Close"
              >
                ✕
              </button>
            </div>

          <div className={styles.settingsContent}>
            <div className={styles.settingGroup}>
              <label className={styles.settingLabel}>Countdown Duration (seconds)</label>
              <input
                type="number"
                className={styles.settingInput}
                value={settings.countdownDuration === 0 ? '' : settings.countdownDuration}
                onChange={(e) => {
                  const value = e.currentTarget.value;
                  if (value === '') {
                    return; // Don't update while empty
                  }
                  handleSettingChange('countdownDuration', Math.max(0, parseInt(value) || 0));
                }}
                onBlur={(e) => {
                  const value = e.currentTarget.value;
                  if (value === '') {
                    handleSettingChange('countdownDuration', 0);
                  }
                }}
                disabled={disabled}
                min="0"
                max="30"
                placeholder="0 for no countdown"
              />
            </div>

            <div className={styles.settingGroup}>
              <label className={styles.settingLabel}>Session Duration (minutes)</label>
              <input
                type="number"
                className={styles.settingInput}
                value={settings.sessionDuration ? Math.round(settings.sessionDuration / 60) : ''}
                onChange={(e) => {
                  const value = parseInt(e.currentTarget.value) || 0;
                  handleSettingChange('sessionDuration', value === 0 ? null : value * 60);
                }}
                disabled={disabled}
                min="0"
                max="180"
                placeholder="0 for unlimited"
              />
            </div>

            <div className={styles.settingsSection}>
              <h4 className={styles.sectionTitle}>Audio Feedback</h4>
              
              <div className={styles.settingGroup}>
                <label className={styles.settingLabel}>Beep every</label>
                <div className={styles.combinedInput}>
                  <input
                    type="number"
                    className={styles.numberInput}
                    value={settings.beepInterval || ''}
                    onChange={(e) => handleSettingChange('beepInterval', Math.max(0, parseInt(e.currentTarget.value) || 0))}
                    disabled={disabled}
                    min="0"
                    max={settings.beepUnit === 'reps' ? 100 : 600}
                    placeholder="0 to disable"
                  />
                  <select
                    className={styles.unitSelect}
                    value={settings.beepUnit}
                    onChange={(e) => {
                      const newSettings = {
                        ...settings,
                        beepUnit: e.currentTarget.value as 'reps' | 'seconds'
                      };
                      onSettingsChange(newSettings);
                    }}
                    disabled={disabled}
                  >
                    <option value="reps">reps</option>
                    <option value="seconds">seconds</option>
                  </select>
                </div>
              </div>

              <div className={styles.settingGroup}>
                <label className={styles.settingLabel}>Announce stats every</label>
                <div className={styles.combinedInput}>
                  <input
                    type="number"
                    className={styles.numberInput}
                    value={settings.announcementInterval || ''}
                    onChange={(e) => handleSettingChange('announcementInterval', Math.max(0, parseInt(e.currentTarget.value) || 0))}
                    disabled={disabled}
                    min="0"
                    max={settings.announcementUnit === 'reps' ? 200 : 30}
                    placeholder="0 to disable"
                  />
                  <select
                    className={styles.unitSelect}
                    value={settings.announcementUnit}
                    onChange={(e) => {
                      const newSettings = {
                        ...settings,
                        announcementUnit: e.currentTarget.value as 'reps' | 'minutes'
                      };
                      onSettingsChange(newSettings);
                    }}
                    disabled={disabled}
                  >
                    <option value="reps">reps</option>
                    <option value="minutes">minutes</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      )}
    </>
  );
}