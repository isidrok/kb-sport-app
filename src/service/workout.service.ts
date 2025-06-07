import { Prediction } from "./prediction.service";

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

// YOLOv8 COCO pose keypoint indices
const KEYPOINT_INDICES = {
  nose: 0,
  left_wrist: 9,
  right_wrist: 10,
} as const;

export class WorkoutService {
  private session: WorkoutSession | null = null;
  private readonly CONFIDENCE_THRESHOLD = 0.2; // Reduced from 0.3 to catch more reps
  private readonly REP_COOLDOWN_MS = 500;
  private readonly RPM_WINDOW = 60000; // 1 minute in milliseconds
  
  // Simplified calibration state
  private calibrationThreshold: number | null = null;
  private isCalibrating = false;
  private calibrationSamples: number[] = [];
  private readonly CALIBRATION_SAMPLES_NEEDED = 30;
  
  // RepTracker-style state tracking
  private rightReady = false;
  private leftReady = false;
  private bothReady = false;
  private wasRightArmAbove = false;
  private wasLeftArmAbove = false;
  private lastRepTime = 0;
  
  // Track when arms went down to prevent quick dips from triggering reps
  private rightArmDownTime = 0;
  private leftArmDownTime = 0;
  private readonly MIN_DOWN_TIME_MS = 300; // Arms must stay down for at least 300ms

  // Calibration methods
  startCalibration(): void {
    this.isCalibrating = true;
    this.calibrationSamples = [];
    this.calibrationThreshold = null;
  }

  getCalibrationProgress(): number {
    return this.calibrationSamples.length / this.CALIBRATION_SAMPLES_NEEDED;
  }

  isCalibrationActive(): boolean {
    return this.isCalibrating;
  }

  isCalibrated(): boolean {
    return this.calibrationThreshold !== null;
  }

  resetCalibration(): void {
    this.isCalibrating = false;
    this.calibrationSamples = [];
    this.calibrationThreshold = null;
  }

  // Session methods  
  startSession(): void {
    if (!this.isCalibrated()) {
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

  private resetTrackingState(): void {
    this.rightReady = false;
    this.leftReady = false;
    this.bothReady = false;
    this.wasRightArmAbove = false;
    this.wasLeftArmAbove = false;
    this.lastRepTime = 0;
    this.rightArmDownTime = 0;
    this.leftArmDownTime = 0;
  }

  processPose(prediction: Prediction): void {
    // Handle calibration if active
    if (this.isCalibrating) {
      this.processCalibration(prediction);
      return;
    }

    // Handle workout session
    if (this.session) {
      this.processWorkout(prediction);
    }
  }

  private processCalibration(prediction: Prediction): void {
    const { keypoints } = prediction;
    const nose = keypoints[KEYPOINT_INDICES.nose];
    const leftWrist = keypoints[KEYPOINT_INDICES.left_wrist];
    const rightWrist = keypoints[KEYPOINT_INDICES.right_wrist];

    // Check confidence
    const noseVisible = nose[2] > this.CONFIDENCE_THRESHOLD;
    const leftWristVisible = leftWrist[2] > this.CONFIDENCE_THRESHOLD;
    const rightWristVisible = rightWrist[2] > this.CONFIDENCE_THRESHOLD;

    if (!noseVisible || (!leftWristVisible && !rightWristVisible)) {
      return;
    }

    // Only record when arms are above nose
    const validLeftWrist = leftWristVisible && leftWrist[1] < nose[1];
    const validRightWrist = rightWristVisible && rightWrist[1] < nose[1];

    if (validLeftWrist || validRightWrist) {
      const highestWrist = Math.min(
        validLeftWrist ? leftWrist[1] : Infinity,
        validRightWrist ? rightWrist[1] : Infinity
      );

      if (highestWrist !== Infinity) {
        this.calibrationSamples.push(highestWrist);
        console.log(`Calibration progress: ${this.calibrationSamples.length}/${this.CALIBRATION_SAMPLES_NEEDED} - Arms raised! Highest wrist Y: ${highestWrist.toFixed(1)}, Nose Y: ${nose[1].toFixed(1)}`);
        
        if (this.calibrationSamples.length >= this.CALIBRATION_SAMPLES_NEEDED) {
          this.finishCalibration();
        }
      } else {
        console.log("Calibration: Please raise your arms above your head");
      }
    }
  }

  private finishCalibration(): void {
    this.calibrationSamples.sort((a, b) => a - b);
    // Use top 50% of samples instead of just 20% for more reliable threshold
    const topSamples = this.calibrationSamples.slice(0, Math.floor(this.calibrationSamples.length * 0.5));
    const averageTop = topSamples.reduce((sum, val) => sum + val, 0) / topSamples.length;
    
    // Add tolerance by making threshold more lenient (higher Y value = lower on screen)
    this.calibrationThreshold = averageTop + 100; // Add 100 pixels of tolerance for better detection
    
    console.log(`Calibration complete: samples=${this.calibrationSamples.length}, topSamples=${topSamples.map(s => s.toFixed(1))}, threshold=${this.calibrationThreshold.toFixed(1)}`);
    this.isCalibrating = false;
  }

  private processWorkout(prediction: Prediction): void {
    const { keypoints } = prediction;
    const nose = keypoints[KEYPOINT_INDICES.nose];
    const leftWrist = keypoints[KEYPOINT_INDICES.left_wrist];
    const rightWrist = keypoints[KEYPOINT_INDICES.right_wrist];

    // Check confidence thresholds
    const noseVisible = nose[2] > this.CONFIDENCE_THRESHOLD;
    const leftWristVisible = leftWrist[2] > this.CONFIDENCE_THRESHOLD;
    const rightWristVisible = rightWrist[2] > this.CONFIDENCE_THRESHOLD;

    if (!noseVisible || (!leftWristVisible && !rightWristVisible)) {
      return;
    }

    // Determine if arms are above the calibrated threshold AND reasonably above nose
    const noseWithTolerance = nose[1] + 30; // Add 30px tolerance below nose
    
    const rightArmAbove = rightWristVisible && 
      rightWrist[1] < this.calibrationThreshold! &&
      rightWrist[1] < noseWithTolerance;
    
    const leftArmAbove = leftWristVisible && 
      leftWrist[1] < this.calibrationThreshold! &&
      leftWrist[1] < noseWithTolerance;

    // Debug threshold info
    if (rightWristVisible || leftWristVisible) {
      console.log(`Positions: nose=${nose[1].toFixed(1)}, threshold=${this.calibrationThreshold!.toFixed(1)}, rightWrist=${rightWristVisible ? `${rightWrist[1].toFixed(1)} (conf: ${rightWrist[2].toFixed(2)})` : 'N/A'}, leftWrist=${leftWristVisible ? `${leftWrist[1].toFixed(1)} (conf: ${leftWrist[2].toFixed(2)})` : 'N/A'}`);
    }

    const currentTime = Date.now();
    
    // Check cooldown period to prevent double counting
    if (currentTime - this.lastRepTime < this.REP_COOLDOWN_MS) {
      this.updateArmStates(rightArmAbove, leftArmAbove);
      return;
    }

    // Debug logging
    console.log(`RepDetection: rightAbove=${rightArmAbove}, leftAbove=${leftArmAbove}, rightReady=${this.rightReady}, leftReady=${this.leftReady}, bothReady=${this.bothReady}, wasRight=${this.wasRightArmAbove}, wasLeft=${this.wasLeftArmAbove}`);

    // RepTracker logic: Check for "both" rep first (highest priority)
    // Allow "both" rep if both arms are detected above OR if only one is detected but was previously both
    const bothArmsDetectedAbove = rightArmAbove && leftArmAbove;
    const likelyBothRep = bothArmsDetectedAbove || 
      ((rightArmAbove && !leftWristVisible && this.wasLeftArmAbove) ||
       (leftArmAbove && !rightWristVisible && this.wasRightArmAbove));
    
    if (
      likelyBothRep &&
      this.bothReady && 
      !this.wasRightArmAbove && 
      !this.wasLeftArmAbove
    ) {
      console.log("🔥 BOTH REP DETECTED!");
      this.addRep("both");
      this.bothReady = false;
      this.rightReady = false;
      this.leftReady = false;
      this.lastRepTime = currentTime;
    }
    // Check for individual arm reps
    else if (
      rightArmAbove && 
      this.rightReady && 
      !this.wasRightArmAbove
    ) {
      console.log("🔥 RIGHT REP DETECTED!");
      this.addRep("right");
      this.rightReady = false;
      this.lastRepTime = currentTime;
    }
    else if (
      leftArmAbove && 
      this.leftReady && 
      !this.wasLeftArmAbove
    ) {
      console.log("🔥 LEFT REP DETECTED!");
      this.addRep("left");
      this.leftReady = false;
      this.lastRepTime = currentTime;
    }

    this.updateArmStates(rightArmAbove, leftArmAbove);
  }

  private updateArmStates(rightArmAbove: boolean, leftArmAbove: boolean): void {
    const currentTime = Date.now();

    // Track when arms go down and start timing
    if (!rightArmAbove && this.wasRightArmAbove) {
      this.rightArmDownTime = currentTime;
    }
    if (!leftArmAbove && this.wasLeftArmAbove) {
      this.leftArmDownTime = currentTime;
    }

    // Update readiness states when arms have been down long enough
    if (!rightArmAbove && this.rightArmDownTime > 0 && 
        (currentTime - this.rightArmDownTime) >= this.MIN_DOWN_TIME_MS) {
      this.rightReady = true;
    }
    
    if (!leftArmAbove && this.leftArmDownTime > 0 && 
        (currentTime - this.leftArmDownTime) >= this.MIN_DOWN_TIME_MS) {
      this.leftReady = true;
    }
    
    // Both ready when both arms have been down long enough
    if (!rightArmAbove && !leftArmAbove && 
        this.rightArmDownTime > 0 && this.leftArmDownTime > 0 &&
        (currentTime - Math.max(this.rightArmDownTime, this.leftArmDownTime)) >= this.MIN_DOWN_TIME_MS) {
      this.bothReady = true;
    }

    // Reset down time when arms go back up
    if (rightArmAbove) {
      this.rightArmDownTime = 0;
    }
    if (leftArmAbove) {
      this.leftArmDownTime = 0;
    }

    // Update previous states
    this.wasRightArmAbove = rightArmAbove;
    this.wasLeftArmAbove = leftArmAbove;
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
    const sessionDurationMinutes = (currentTime - this.session.startTime) / (1000 * 60);

    if (sessionDurationMinutes > 0) {
      this.session.repsPerMinute = this.session.totalReps / sessionDurationMinutes;
    }
  }

  private getEstimatedRPM(): number {
    if (!this.session || this.session.reps.length < 2) {
      return this.session?.reps.length || 0;
    }

    const currentTime = Date.now();
    const recentReps = this.session.reps.filter(
      rep => currentTime - rep.timestamp <= this.RPM_WINDOW
    );

    if (recentReps.length < 2) {
      return recentReps.length;
    }

    // Calculate intervals between consecutive reps
    const intervals: number[] = [];
    for (let i = 1; i < recentReps.length; i++) {
      intervals.push(recentReps[i].timestamp - recentReps[i - 1].timestamp);
    }

    // Calculate average interval
    const averageInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;

    // Convert to RPM and cap at 60
    return averageInterval
      ? Math.min(Math.round(this.RPM_WINDOW / averageInterval), 60)
      : recentReps.length;
  }

  getCurrentSession(): WorkoutSession | null {
    return this.session;
  }

  endSession(): WorkoutSession | null {
    const finalSession = this.session;
    this.session = null;
    this.resetCalibration();
    return finalSession;
  }
}
