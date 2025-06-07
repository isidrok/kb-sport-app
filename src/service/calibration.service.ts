import { Prediction } from "./prediction.service";
import { COCO_KEYPOINTS } from "../config/coco-keypoints";

const CALIBRATION_CONFIG = {
  CONFIDENCE_THRESHOLD: 0.3,
  SAMPLES_NEEDED: 30,
  ERROR_MARGIN: 0.4,
  // Anchor points for calibration
  LEFT_ARM_ANCHOR: COCO_KEYPOINTS.left_wrist,
  RIGHT_ARM_ANCHOR: COCO_KEYPOINTS.right_wrist,
  HEAD_ANCHOR: COCO_KEYPOINTS.nose,
} as const;

interface ArmData {
  samples: number[];
  threshold: number | null;
}

export interface CalibrationThresholds {
  left: number;
  right: number;
}

export class CalibrationService {
  private isCalibrating = false;
  private leftArm: ArmData = { samples: [], threshold: null };
  private rightArm: ArmData = { samples: [], threshold: null };

  start(): void {
    this.isCalibrating = true;
    this.resetArmData();
  }

  isCalibrationActive(): boolean {
    return this.isCalibrating;
  }

  getCalibrationProgress(): number {
    const totalSamples = Math.max(this.leftArm.samples.length, this.rightArm.samples.length);
    return totalSamples / CALIBRATION_CONFIG.SAMPLES_NEEDED;
  }

  isCalibrated(): boolean {
    return this.leftArm.threshold !== null && this.rightArm.threshold !== null;
  }

  getThresholds(): CalibrationThresholds | null {
    if (!this.isCalibrated()) {
      return null;
    }

    return {
      left: this.leftArm.threshold!,
      right: this.rightArm.threshold!
    };
  }

  resetCalibration(): void {
    this.isCalibrating = false;
    this.resetArmData();
  }

  process(prediction: Prediction): void {
    if (!this.isCalibrating) return;

    const { keypoints } = prediction;
    const leftArmAnchor = keypoints[CALIBRATION_CONFIG.LEFT_ARM_ANCHOR];
    const rightArmAnchor = keypoints[CALIBRATION_CONFIG.RIGHT_ARM_ANCHOR];
    const headAnchor = keypoints[CALIBRATION_CONFIG.HEAD_ANCHOR];

    // Check if both arms are extended (required for calibration)
    const leftExtended = this.isArmExtended(leftArmAnchor, headAnchor);
    const rightExtended = this.isArmExtended(rightArmAnchor, headAnchor);

    if (!leftExtended || !rightExtended) {
      return; // Don't collect samples unless both arms are extended
    }

    // Collect samples for each arm
    this.collectArmSample(this.leftArm, leftArmAnchor);
    this.collectArmSample(this.rightArm, rightArmAnchor);

    // Check if calibration is complete
    if (this.isSamplingComplete()) {
      this.finishCalibration();
    }
  }

  // Private helper methods
  private resetArmData(): void {
    this.leftArm = { samples: [], threshold: null };
    this.rightArm = { samples: [], threshold: null };
  }

  private isArmExtended(armAnchor: number[], headAnchor: number[]): boolean {
    const armVisible = armAnchor[2] > CALIBRATION_CONFIG.CONFIDENCE_THRESHOLD;
    const headVisible = headAnchor[2] > CALIBRATION_CONFIG.CONFIDENCE_THRESHOLD;
    const armAboveHead = armAnchor[1] < headAnchor[1];

    return armVisible && headVisible && armAboveHead;
  }

  private collectArmSample(armData: ArmData, armAnchor: number[]): void {
    const armVisible = armAnchor[2] > CALIBRATION_CONFIG.CONFIDENCE_THRESHOLD;

    if (armVisible && armData.samples.length < CALIBRATION_CONFIG.SAMPLES_NEEDED) {
      armData.samples.push(armAnchor[1]); // y-coordinate
    }
  }

  private isSamplingComplete(): boolean {
    return (
      this.leftArm.samples.length >= CALIBRATION_CONFIG.SAMPLES_NEEDED &&
      this.rightArm.samples.length >= CALIBRATION_CONFIG.SAMPLES_NEEDED
    );
  }

  private finishCalibration(): void {
    this.leftArm.threshold = this.calculateAverage(this.leftArm.samples);
    this.rightArm.threshold = this.calculateAverage(this.rightArm.samples);
    this.isCalibrating = false;
  }

  private calculateAverage(samples: number[]): number {
    return samples.reduce((sum, val) => sum + val, 0) / samples.length;
  }
}
