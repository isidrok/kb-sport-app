import { keypointNames } from "./keypoints";

export interface RepRecord {
  timestamp: number;
  type: "right" | "left" | "both";
}

export interface RepStats {
  totalReps: number;
  rpm: number;
}

export class RepTracker {
  private repetitions = 0;
  private readonly CONFIDENCE_THRESHOLD = 0.7;
  private readonly DEBOUNCE_TIME = 400; // milliseconds
  private readonly RPM_WINDOW = 60000; // 1 minute in milliseconds
  private readonly MIN_REPS_FOR_PACE = 2; // Minimum reps needed to calculate pace
  private lastDetection = 0;
  private wasRightArmAbove = false;
  private wasLeftArmAbove = false;
  private rightReady = true;
  private leftReady = true;
  private bothReady = true;

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

  private isArmAbove(armAnchor: number[], headAnchor: number[]): boolean {
    const isWristDetected = armAnchor[2] > this.CONFIDENCE_THRESHOLD;
    const isNoseDetected = headAnchor[2] > this.CONFIDENCE_THRESHOLD;

    // Check if wrist is above nose
    // Lower y values mean higher position in the frame
    return isWristDetected && isNoseDetected && armAnchor[1] < headAnchor[1];
  }

  getRepHistory(): RepRecord[] {
    return [...this.repHistory];
  }

  reset() {
    this.repetitions = 0;
    this.repHistory = [];
    this.wasRightArmAbove = false;
    this.wasLeftArmAbove = false;
    this.lastDetection = 0;
    this.rightReady = true;
    this.leftReady = true;
    this.bothReady = true;
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

    const rightElbow = keypoints[keypointNames.right_wrist];
    const leftElbow = keypoints[keypointNames.left_wrist];
    const nose = keypoints[keypointNames.nose];

    const rightArmAbove = this.isArmAbove(rightElbow, nose);
    const leftArmAbove = this.isArmAbove(leftElbow, nose);

    // Only count one rep per frame, prioritizing 'both' over 'right'/'left', and require ready state
    if (
      rightArmAbove &&
      leftArmAbove &&
      this.bothReady &&
      !this.wasRightArmAbove &&
      !this.wasLeftArmAbove
    ) {
      this.addRep("both");
      this.bothReady = false;
      this.rightReady = false;
      this.leftReady = false;
    } else if (rightArmAbove && this.rightReady && !this.wasRightArmAbove) {
      this.addRep("right");
      this.rightReady = false;
    } else if (leftArmAbove && this.leftReady && !this.wasLeftArmAbove) {
      this.addRep("left");
      this.leftReady = false;
    }

    // Reset ready state when arm goes below
    if (!rightArmAbove) {
      this.rightReady = true;
    }
    if (!leftArmAbove) {
      this.leftReady = true;
    }
    if (!rightArmAbove && !leftArmAbove) {
      this.bothReady = true;
    }

    this.wasRightArmAbove = rightArmAbove;
    this.wasLeftArmAbove = leftArmAbove;

    return {
      totalReps: this.repetitions,
      rpm: this.getEstimatedRPM(),
    };
  }
}
