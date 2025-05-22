import { keypointNames } from "./keypoints";

interface RepRecord {
  timestamp: number;
  type: "right" | "left" | "both";
}

export interface RepStats {
  totalReps: number;
  rpm: number;
}

export class RepTracker {
  private repetitions = 0;
  private readonly CONFIDENCE_THRESHOLD = 0.5;
  private readonly DEBOUNCE_TIME = 200; // milliseconds
  private readonly RPM_WINDOW = 60000; // 1 minute in milliseconds
  private readonly MIN_REPS_FOR_PACE = 2; // Minimum reps needed to calculate pace
  private lastDetection = 0;
  private wasRightArmAbove = false;
  private wasLeftArmAbove = false;

  private repHistory: RepRecord[] = [];

  constructor() {}

  private addRep(type: "right" | "left" | "both") {
    this.repetitions++;
    const timestamp = Date.now();
    this.repHistory.push({ timestamp, type });
  }

  private getEstimatedRPM(): number {
    const now = Date.now();
    const recentReps = this.repHistory.filter(
      (rep) => rep.timestamp >= now - this.RPM_WINDOW
    );

    if (recentReps.length < this.MIN_REPS_FOR_PACE) {
      return recentReps.length;
    }

    const intervals = recentReps
      .slice(1)
      .map((rep, i) => rep.timestamp - recentReps[i].timestamp);
    const averageInterval =
      intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;

    return averageInterval
      ? Math.min(Math.round(this.RPM_WINDOW / averageInterval), 60)
      : recentReps.length;
  }

  private isArmAbove(wrist: number[], nose: number[]): boolean {
    const isWristDetected = wrist[2] > this.CONFIDENCE_THRESHOLD;
    const isNoseDetected = nose[2] > this.CONFIDENCE_THRESHOLD;

    // Check if wrist is above nose
    // Lower y values mean higher position in the frame
    return isWristDetected && isNoseDetected && wrist[1] < nose[1];
  }

  getRepHistory(): RepRecord[] {
    return [...this.repHistory];
  }

  detect(keypoints: number[][]): RepStats {
    const now = Date.now();
    if (now - this.lastDetection < this.DEBOUNCE_TIME) {
      return {
        totalReps: this.repetitions,
        rpm: this.getEstimatedRPM(),
      };
    }
    this.lastDetection = now;

    const rightWrist = keypoints[keypointNames.right_wrist];
    const leftWrist = keypoints[keypointNames.left_wrist];
    const nose = keypoints[keypointNames.nose];

    const rightArmAbove = this.isArmAbove(rightWrist, nose);
    const leftArmAbove = this.isArmAbove(leftWrist, nose);

    // Handle right arm
    if (rightArmAbove && !this.wasRightArmAbove) {
      this.addRep("right");
    }

    // Handle left arm
    if (leftArmAbove && !this.wasLeftArmAbove) {
      this.addRep("left");
    }

    // Handle both arms
    if (
      rightArmAbove &&
      leftArmAbove &&
      !this.wasRightArmAbove &&
      !this.wasLeftArmAbove
    ) {
      this.addRep("both");
    }

    this.wasRightArmAbove = rightArmAbove;
    this.wasLeftArmAbove = leftArmAbove;

    return {
      totalReps: this.repetitions,
      rpm: this.getEstimatedRPM(),
    };
  }

  reset() {
    this.repetitions = 0;
    this.repHistory = [];
    this.wasRightArmAbove = false;
    this.wasLeftArmAbove = false;
    this.lastDetection = 0;
  }
}
