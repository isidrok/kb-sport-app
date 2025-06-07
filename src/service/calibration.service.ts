import { Prediction } from "./prediction.service";
import { COCO_KEYPOINTS } from "../config/coco-keypoints";

export class CalibrationService {
  private readonly CONFIDENCE_THRESHOLD = 0.3;
  private readonly CALIBRATION_SAMPLES_NEEDED = 30;
  private readonly THRESHOLD_ERROR_MARGIN = 0.4;

  private isCalibrating = false;
  private leftArmSamples: number[] = [];
  private rightArmSamples: number[] = [];
  private leftArmThreshold: number | null = null;
  private rightArmThreshold: number | null = null;

  startCalibration(): void {
    this.isCalibrating = true;
    this.leftArmSamples = [];
    this.rightArmSamples = [];
    this.leftArmThreshold = null;
    this.rightArmThreshold = null;
  }

  isCalibrationActive(): boolean {
    return this.isCalibrating;
  }

  getCalibrationProgress(): number {
    const totalSamples = Math.max(
      this.leftArmSamples.length,
      this.rightArmSamples.length
    );
    return totalSamples / this.CALIBRATION_SAMPLES_NEEDED;
  }

  isCalibrated(): boolean {
    return this.leftArmThreshold !== null && this.rightArmThreshold !== null;
  }

  getThresholds(): { left: number | null; right: number | null } {
    return { left: this.leftArmThreshold, right: this.rightArmThreshold };
  }

  resetCalibration(): void {
    this.isCalibrating = false;
    this.leftArmSamples = [];
    this.rightArmSamples = [];
    this.leftArmThreshold = null;
    this.rightArmThreshold = null;
  }

  processPose(prediction: Prediction): void {
    if (!this.isCalibrating) return;

    const { keypoints } = prediction;
    const leftArmAnchor = keypoints[COCO_KEYPOINTS.left_wrist];
    const rightArmAnchor = keypoints[COCO_KEYPOINTS.right_wrist];
    const leftShoulder = keypoints[COCO_KEYPOINTS.left_shoulder];
    const rightShoulder = keypoints[COCO_KEYPOINTS.right_shoulder];

    const leftVisible = leftArmAnchor[2] > this.CONFIDENCE_THRESHOLD;
    const rightVisible = rightArmAnchor[2] > this.CONFIDENCE_THRESHOLD;
    const leftShoulderVisible = leftShoulder[2] > this.CONFIDENCE_THRESHOLD;
    const rightShoulderVisible = rightShoulder[2] > this.CONFIDENCE_THRESHOLD;

    // Only collect samples when both arms are extended (above shoulders)
    const leftExtended =
      leftVisible && leftShoulderVisible && leftArmAnchor[1] < leftShoulder[1];
    const rightExtended =
      rightVisible &&
      rightShoulderVisible &&
      rightArmAnchor[1] < rightShoulder[1];

    if (!leftExtended || !rightExtended) {
      return; // Don't collect samples unless both arms are extended
    }

    if (
      leftVisible &&
      this.leftArmSamples.length < this.CALIBRATION_SAMPLES_NEEDED
    ) {
      this.leftArmSamples.push(leftArmAnchor[1]);
    }

    if (
      rightVisible &&
      this.rightArmSamples.length < this.CALIBRATION_SAMPLES_NEEDED
    ) {
      this.rightArmSamples.push(rightArmAnchor[1]);
    }

    if (
      this.leftArmSamples.length >= this.CALIBRATION_SAMPLES_NEEDED &&
      this.rightArmSamples.length >= this.CALIBRATION_SAMPLES_NEEDED
    ) {
      this.finishCalibration();
    }
  }

  private finishCalibration(): void {
    // Calculate average threshold for left arm
    const leftAverage =
      this.leftArmSamples.reduce((sum, val) => sum + val, 0) /
      this.leftArmSamples.length;
    this.leftArmThreshold = leftAverage;

    // Calculate average threshold for right arm
    const rightAverage =
      this.rightArmSamples.reduce((sum, val) => sum + val, 0) /
      this.rightArmSamples.length;
    this.rightArmThreshold = rightAverage;

    this.isCalibrating = false;
  }

  isArmInThreshold(prediction: Prediction): { left: boolean; right: boolean } {
    if (!this.isCalibrated()) {
      return { left: false, right: false };
    }

    const { keypoints } = prediction;
    const leftArmAnchor = keypoints[COCO_KEYPOINTS.left_wrist];
    const rightArmAnchor = keypoints[COCO_KEYPOINTS.right_wrist];

    const leftVisible = leftArmAnchor[2] > this.CONFIDENCE_THRESHOLD;
    const rightVisible = rightArmAnchor[2] > this.CONFIDENCE_THRESHOLD;

    const leftInThreshold =
      leftVisible &&
      Math.abs(leftArmAnchor[1] - this.leftArmThreshold!) <=
        this.leftArmThreshold! * this.THRESHOLD_ERROR_MARGIN;
    const rightInThreshold =
      rightVisible &&
      Math.abs(rightArmAnchor[1] - this.rightArmThreshold!) <=
        this.rightArmThreshold! * this.THRESHOLD_ERROR_MARGIN;

    return { left: leftInThreshold, right: rightInThreshold };
  }
}
