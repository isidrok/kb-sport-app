import { Prediction } from "./prediction.service";
import { CalibrationService } from "./calibration.service";

export interface Rep {
  timestamp: number;
  armType: "left" | "right" | "both";
}

export interface WorkoutSession {
  startTime: number;
  reps: Rep[];
  totalReps: number;
  repsPerMinute: number;
  estimatedRepsPerMinute: number;
}

export class RepCountingService {
  private readonly DEBOUNCE_MS = 500;
  private readonly RPM_WINDOW = 60000;

  private session: WorkoutSession | null = null;
  private calibrationService: CalibrationService;

  // Rep tracking state
  private leftArmInThreshold = false;
  private rightArmInThreshold = false;
  private lastRepTime = 0;

  constructor(calibrationService: CalibrationService) {
    this.calibrationService = calibrationService;
  }

  startSession(): void {
    if (!this.calibrationService.isCalibrated()) {
      throw new Error("Must complete calibration before starting session");
    }

    this.session = {
      startTime: Date.now(),
      reps: [],
      totalReps: 0,
      repsPerMinute: 0,
      estimatedRepsPerMinute: 0,
    };
    this.resetTrackingState();
  }

  endSession(): WorkoutSession | null {
    const finalSession = this.session;
    this.session = null;
    return finalSession;
  }

  getCurrentSession(): WorkoutSession | null {
    return this.session;
  }

  processPose(prediction: Prediction): void {
    if (!this.session) return;

    const armStatus = this.calibrationService.isArmInThreshold(prediction);
    const currentTime = Date.now();

    // Global debounce check
    if (currentTime - this.lastRepTime < this.DEBOUNCE_MS) {
      this.leftArmInThreshold = armStatus.left;
      this.rightArmInThreshold = armStatus.right;
      return;
    }

    // Check if any arm entered threshold
    const leftEntered = armStatus.left && !this.leftArmInThreshold;
    const rightEntered = armStatus.right && !this.rightArmInThreshold;

    // Prioritize "both" rep when both arms enter threshold simultaneously
    if (leftEntered && rightEntered) {
      this.addRep("both");
      this.lastRepTime = currentTime;
    }
    // Single arm reps
    else if (leftEntered) {
      this.addRep("left");
      this.lastRepTime = currentTime;
    }
    else if (rightEntered) {
      this.addRep("right");
      this.lastRepTime = currentTime;
    }

    this.leftArmInThreshold = armStatus.left;
    this.rightArmInThreshold = armStatus.right;
  }

  private resetTrackingState(): void {
    this.leftArmInThreshold = false;
    this.rightArmInThreshold = false;
    this.lastRepTime = 0;
  }

  private addRep(armType: "left" | "right" | "both"): void {
    if (!this.session) return;

    const rep: Rep = {
      timestamp: Date.now(),
      armType,
    };

    this.session.reps.push(rep);
    this.session.totalReps++;
    this.updateRepsPerMinute();
    this.session.estimatedRepsPerMinute = this.getEstimatedRPM();
  }

  private updateRepsPerMinute(): void {
    if (!this.session) return;

    const currentTime = Date.now();
    const sessionDurationMinutes =
      (currentTime - this.session.startTime) / (1000 * 60);

    if (sessionDurationMinutes > 0) {
      this.session.repsPerMinute =
        this.session.totalReps / sessionDurationMinutes;
    }
  }

  private getEstimatedRPM(): number {
    if (!this.session || this.session.reps.length < 2) {
      return this.session?.reps.length || 0;
    }

    const currentTime = Date.now();
    const recentReps = this.session.reps.filter(
      (rep) => currentTime - rep.timestamp <= this.RPM_WINDOW
    );

    if (recentReps.length < 2) {
      return recentReps.length;
    }

    const intervals: number[] = [];
    for (let i = 1; i < recentReps.length; i++) {
      intervals.push(recentReps[i].timestamp - recentReps[i - 1].timestamp);
    }

    const averageInterval =
      intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;

    return averageInterval
      ? Math.min(Math.round(this.RPM_WINDOW / averageInterval), 60)
      : recentReps.length;
  }
}
