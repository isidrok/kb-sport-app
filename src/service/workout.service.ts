import { Prediction } from "./prediction.service";
import { CalibrationService } from "./calibration.service";

export interface Rep {
  timestamp: number;
  handType: "left" | "right" | "both";
}

export interface WorkoutSession {
  startTime: number;
  reps: Rep[];
  totalReps: number;
  repsPerMinute: number;
}

// YOLOv8 COCO pose keypoint indices
const KEYPOINT_INDICES = {
  nose: 0,
  left_shoulder: 5,
  right_shoulder: 6,
  left_elbow: 7,
  right_elbow: 8,
  left_wrist: 9,
  right_wrist: 10,
} as const;

export class WorkoutService {
  private session: WorkoutSession | null = null;
  private readonly CONFIDENCE_THRESHOLD = 0.3;
  private readonly REP_COOLDOWN_MS = 500; // Prevent double counting
  private lastRepTime = 0;
  private calibrationService: CalibrationService;
  
  // RepTracker-style state tracking
  private rightReady = false;
  private leftReady = false;
  private bothReady = false;
  private wasRightArmAbove = false;
  private wasLeftArmAbove = false;

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
  }

  initializeArmStatesFromCurrentPose(prediction: Prediction): void {
    if (!this.session) return;

    const armExtension = this.calibrationService.isArmExtendedOverhead(prediction);
    this.wasRightArmAbove = armExtension.right;
    this.wasLeftArmAbove = armExtension.left;
    
    console.log("WorkoutService: Initialized arm states from current pose - right:", this.wasRightArmAbove, "left:", this.wasLeftArmAbove);
  }

  processPose(prediction: Prediction): void {
    if (!this.session) {
      console.log("WorkoutService: No active session");
      return;
    }

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

    // Use calibration service to determine if arms are above threshold
    const armExtension = this.calibrationService.isArmExtendedOverhead(prediction);
    const rightArmAbove = armExtension.right;
    const leftArmAbove = armExtension.left;

    const currentTime = Date.now();
    
    // Check cooldown period to prevent double counting
    if (currentTime - this.lastRepTime < this.REP_COOLDOWN_MS) {
      return;
    }

    // RepTracker logic: Check for "both" rep first
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
      this.lastRepTime = currentTime;
    }
    // Check for individual arm reps
    else if (
      rightArmAbove && 
      this.rightReady && 
      !this.wasRightArmAbove
    ) {
      this.addRep("right");
      this.rightReady = false;
      this.lastRepTime = currentTime;
    }
    else if (
      leftArmAbove && 
      this.leftReady && 
      !this.wasLeftArmAbove
    ) {
      this.addRep("left");
      this.leftReady = false;
      this.lastRepTime = currentTime;
    }

    // Update readiness states when arms go down
    if (!rightArmAbove && this.wasRightArmAbove) {
      this.rightReady = true;
    }
    if (!leftArmAbove && this.wasLeftArmAbove) {
      this.leftReady = true;
    }
    if (!rightArmAbove && !leftArmAbove && (this.wasRightArmAbove || this.wasLeftArmAbove)) {
      this.bothReady = true;
    }

    // Update previous states
    this.wasRightArmAbove = rightArmAbove;
    this.wasLeftArmAbove = leftArmAbove;

    console.log(
      "WorkoutService: rightAbove:", rightArmAbove,
      "leftAbove:", leftArmAbove,
      "rightReady:", this.rightReady,
      "leftReady:", this.leftReady,
      "bothReady:", this.bothReady,
      "wasRightAbove:", this.wasRightArmAbove,
      "wasLeftAbove:", this.wasLeftArmAbove
    );
  }

  private addRep(handType: "left" | "right" | "both"): void {
    if (!this.session) return;

    const rep: Rep = {
      timestamp: Date.now(),
      handType,
    };

    this.session.reps.push(rep);
    this.session.totalReps++;
    this.updateRepsPerMinute();
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

  getCurrentSession(): WorkoutSession | null {
    return this.session;
  }

  isCalibrated(): boolean {
    return this.calibrationService.isCalibrated();
  }

  endSession(): WorkoutSession | null {
    const finalSession = this.session;
    this.session = null;
    return finalSession;
  }
}
