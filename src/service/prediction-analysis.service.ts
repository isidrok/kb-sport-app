import { Prediction } from "./prediction.service";
import { COCO_KEYPOINTS } from "../config/coco-keypoints";
import { CONFIDENCE_THRESHOLD } from "../config/services.config";

const ANALYSIS_CONFIG = {
  SMOOTHING_WINDOW: 3,
  OVERHEAD_HOLD_MS: 150,
  BELOW_HEAD_TIME_MS: 300,
  REP_DEBOUNCE_MS: 800,
} as const;

type RepState = "ready" | "overhead" | "complete";


interface ArmStateMachine {
  state: RepState;
  lastStateChange: number;
  repStartTime: number;
  overheadDetectedTime: number;
  belowHeadStartTime: number;
}

export interface RepDetection {
  detected: boolean;
  armType: "left" | "right" | "both";
  timestamp: number;
}

export class PredictionAnalysisService {
  private stateMachine: ArmStateMachine = this.createInitialState();
  private lastRepTime = 0;

  resetState(): void {
    this.stateMachine = this.createInitialState();
    this.lastRepTime = 0;
  }

  analyzeForRep(prediction: Prediction): RepDetection {
    const currentTime = Date.now();

    // Check if key points are visible
    if (!this.hasValidKeypoints(prediction)) {
      return {
        detected: false,
        armType: "both",
        timestamp: currentTime,
      };
    }

    // Check for debounce first
    if (currentTime - this.lastRepTime <= ANALYSIS_CONFIG.REP_DEBOUNCE_MS) {
      return {
        detected: false,
        armType: "both",
        timestamp: currentTime,
      };
    }

    // Check all arm patterns and return the first detected rep (prioritize both arms, then left, then right)
    const detectedArmType = this.detectRepPattern(prediction, currentTime);
    
    if (detectedArmType) {
      this.lastRepTime = currentTime;
      return {
        detected: true,
        armType: detectedArmType,
        timestamp: currentTime,
      };
    }

    return {
      detected: false,
      armType: "both",
      timestamp: currentTime,
    };
  }

  private createInitialState(): ArmStateMachine {
    return {
      state: "ready",
      lastStateChange: Date.now(),
      repStartTime: 0,
      overheadDetectedTime: 0,
      belowHeadStartTime: 0,
    };
  }

  private hasValidKeypoints(prediction: Prediction): boolean {
    const { keypoints } = prediction;

    const leftWrist = keypoints[COCO_KEYPOINTS.left_wrist];
    const rightWrist = keypoints[COCO_KEYPOINTS.right_wrist];
    const nose = keypoints[COCO_KEYPOINTS.nose];

    return (
      leftWrist[2] >= CONFIDENCE_THRESHOLD &&
      rightWrist[2] >= CONFIDENCE_THRESHOLD &&
      nose[2] >= CONFIDENCE_THRESHOLD
    );
  }

  private detectRepPattern(prediction: Prediction, currentTime: number): "left" | "right" | "both" | null {
    // Check both arms first (highest priority)
    if (this.analyzeArmPattern(prediction, "both", currentTime)) {
      return "both";
    }
    
    // Check left arm
    if (this.analyzeArmPattern(prediction, "left", currentTime)) {
      return "left";
    }
    
    // Check right arm
    if (this.analyzeArmPattern(prediction, "right", currentTime)) {
      return "right";
    }
    
    return null;
  }

  private analyzeArmPattern(
    prediction: Prediction,
    armType: "left" | "right" | "both",
    currentTime: number
  ): boolean {
    const overhead = this.isArmOverhead(prediction, armType);

    switch (this.stateMachine.state) {
      case "ready":
        return this.handleReadyState(overhead, currentTime);
      case "overhead":
        return this.handleOverheadState(overhead, currentTime);
      case "complete":
        return this.handleCompleteState(overhead, currentTime);
      default:
        return false;
    }
  }

  private isArmOverhead(prediction: Prediction, armType: "left" | "right" | "both"): boolean {
    const { keypoints } = prediction;
    const leftWrist = keypoints[COCO_KEYPOINTS.left_wrist];
    const rightWrist = keypoints[COCO_KEYPOINTS.right_wrist];
    const nose = keypoints[COCO_KEYPOINTS.nose];

    if (armType === "both") {
      return leftWrist[1] < nose[1] - 50 && rightWrist[1] < nose[1] - 50;
    }
    
    const wrist = armType === "left" ? leftWrist : rightWrist;
    return wrist[1] < nose[1] - 50;
  }

  private handleReadyState(overhead: boolean, currentTime: number): boolean {
    if (overhead) {
      this.stateMachine.state = "overhead";
      this.stateMachine.lastStateChange = currentTime;
      this.stateMachine.repStartTime = currentTime;
      this.stateMachine.overheadDetectedTime = currentTime;
    }
    return false;
  }

  private handleOverheadState(overhead: boolean, currentTime: number): boolean {
    const holdTime = currentTime - this.stateMachine.overheadDetectedTime;

    if (holdTime > ANALYSIS_CONFIG.OVERHEAD_HOLD_MS) {
      this.stateMachine.state = "complete";
      this.stateMachine.lastStateChange = currentTime;
      this.stateMachine.belowHeadStartTime = 0;
      return true;
    } else if (!overhead) {
      this.stateMachine.state = "ready";
      this.stateMachine.lastStateChange = currentTime;
    }
    return false;
  }

  private handleCompleteState(overhead: boolean, currentTime: number): boolean {
    if (!overhead) {
      if (this.stateMachine.belowHeadStartTime === 0) {
        this.stateMachine.belowHeadStartTime = currentTime;
      }

      const belowHeadTime = currentTime - this.stateMachine.belowHeadStartTime;
      if (belowHeadTime > ANALYSIS_CONFIG.BELOW_HEAD_TIME_MS) {
        this.stateMachine.state = "ready";
        this.stateMachine.lastStateChange = currentTime;
        this.stateMachine.belowHeadStartTime = 0;
      }
    } else {
      this.stateMachine.belowHeadStartTime = 0;
    }
    return false;
  }
}
