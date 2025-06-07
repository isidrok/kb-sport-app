import { Prediction } from "./prediction.service";

// YOLOv8 COCO pose keypoint indices
const KEYPOINT_INDICES = {
  nose: 0,
  left_wrist: 9,
  right_wrist: 10,
} as const;

export class CalibrationService {
  private isCalibrating = false;
  private calibrationSamples: number[] = [];
  private readonly CALIBRATION_SAMPLES_NEEDED = 30; // ~1 second at 30fps
  private readonly CONFIDENCE_THRESHOLD = 0.3;
  private calibrationThreshold: number | null = null;
  private adjustedThreshold: number | null = null;

  startCalibration(): void {
    this.isCalibrating = true;
    this.calibrationSamples = [];
    this.calibrationThreshold = null;
    console.log("CalibrationService: Starting calibration - raise your arms fully overhead");
  }

  processPose(prediction: Prediction): void {
    if (!this.isCalibrating) return;

    const { keypoints } = prediction;
    const nose = keypoints[KEYPOINT_INDICES.nose];
    const leftWrist = keypoints[KEYPOINT_INDICES.left_wrist];
    const rightWrist = keypoints[KEYPOINT_INDICES.right_wrist];

    // Check if we have sufficient confidence
    const noseVisible = nose[2] > this.CONFIDENCE_THRESHOLD;
    const leftWristVisible = leftWrist[2] > this.CONFIDENCE_THRESHOLD;
    const rightWristVisible = rightWrist[2] > this.CONFIDENCE_THRESHOLD;

    if ((!leftWristVisible && !rightWristVisible) || !noseVisible) {
      return;
    }

    // Only record samples when arms are actually raised above the nose
    const validLeftWrist = leftWristVisible && leftWrist[1] < nose[1];
    const validRightWrist = rightWristVisible && rightWrist[1] < nose[1];

    if (validLeftWrist || validRightWrist) {
      // Record the highest wrist position during calibration
      const highestWrist = Math.min(
        validLeftWrist ? leftWrist[1] : Infinity,
        validRightWrist ? rightWrist[1] : Infinity
      );

      if (highestWrist !== Infinity) {
        this.calibrationSamples.push(highestWrist);
        console.log(`Calibration progress: ${this.calibrationSamples.length}/${this.CALIBRATION_SAMPLES_NEEDED} - Arms raised!`);

        if (this.calibrationSamples.length >= this.CALIBRATION_SAMPLES_NEEDED) {
          this.finishCalibration();
        }
      }
    } else {
      console.log("Calibration: Please raise your arms above your head");
    }
  }

  private finishCalibration(): void {
    if (this.calibrationSamples.length >= this.CALIBRATION_SAMPLES_NEEDED) {
      // Use the average of the highest positions as threshold
      this.calibrationSamples.sort((a, b) => a - b); // Sort ascending (lower y = higher position)
      const topSamples = this.calibrationSamples.slice(0, Math.floor(this.calibrationSamples.length * 0.2)); // Top 20%
      this.calibrationThreshold = topSamples.reduce((sum, val) => sum + val, 0) / topSamples.length;
      
      // Pre-calculate adjusted threshold with 20% tolerance (once, not every frame)
      this.adjustedThreshold = this.calibrationThreshold + (this.calibrationThreshold * 0.2);
      
      console.log("CalibrationService: Calibration complete. Original:", this.calibrationThreshold, "Adjusted:", this.adjustedThreshold);
      this.isCalibrating = false;
    }
  }

  isCalibrationActive(): boolean {
    return this.isCalibrating;
  }

  getCalibrationProgress(): number {
    return this.calibrationSamples.length / this.CALIBRATION_SAMPLES_NEEDED;
  }

  getThreshold(): number | null {
    return this.calibrationThreshold;
  }

  isCalibrated(): boolean {
    return this.calibrationThreshold !== null;
  }

  reset(): void {
    this.isCalibrating = false;
    this.calibrationSamples = [];
    this.calibrationThreshold = null;
    this.adjustedThreshold = null;
  }

  isArmExtendedOverhead(prediction: Prediction): { left: boolean; right: boolean } {
    if (!this.isCalibrated() || !this.adjustedThreshold) {
      return { left: false, right: false };
    }

    const { keypoints } = prediction;
    const leftWrist = keypoints[KEYPOINT_INDICES.left_wrist];
    const rightWrist = keypoints[KEYPOINT_INDICES.right_wrist];

    const leftWristVisible = leftWrist[2] > this.CONFIDENCE_THRESHOLD;
    const rightWristVisible = rightWrist[2] > this.CONFIDENCE_THRESHOLD;

    // Simple comparison using pre-calculated adjusted threshold
    const leftExtended = leftWristVisible && leftWrist[1] < this.adjustedThreshold;
    const rightExtended = rightWristVisible && rightWrist[1] < this.adjustedThreshold;

    return { left: leftExtended, right: rightExtended };
  }

  getThresholdInfo(): { original: number | null; adjusted: number | null } | null {
    if (!this.isCalibrated()) {
      return null;
    }
    
    return {
      original: this.calibrationThreshold,
      adjusted: this.adjustedThreshold
    };
  }
}