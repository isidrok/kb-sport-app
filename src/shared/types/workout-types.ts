export interface WorkoutSettings {
  countdownDuration: number;
  sessionDuration: number | null; // null for unlimited
  autoStopOnTimeLimit: boolean; // auto stop when session duration reached
  beepInterval: number; // beep every X units (0 = disabled)
  beepUnit: "reps" | "seconds"; // unit for beeps
  announcementInterval: number; // announce every X units (0 = disabled)
  announcementUnit: "reps" | "seconds"; // unit for announcements
}