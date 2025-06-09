import { Prediction } from "./prediction.service";
import { COCO_KEYPOINTS } from "../shared/constants/coco-keypoints";
import { CONFIDENCE_THRESHOLD } from "../shared/constants/services.config";

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
  private stateMachines: Record<"left" | "right" | "both", ArmStateMachine> = {
    left: this.createInitialState(),
    right: this.createInitialState(),
    both: this.createInitialState(),
  };
  private lastRepTime = 0;

  resetState(): void {
    this.stateMachines = {
      left: this.createInitialState(),
      right: this.createInitialState(),
      both: this.createInitialState(),
    };
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

    // Check all patterns and apply debounce per detection (like working version)
    const bothArmsRep = this.analyzeArmPattern(prediction, "both", currentTime);
    const leftArmRep = this.analyzeArmPattern(prediction, "left", currentTime);
    const rightArmRep = this.analyzeArmPattern(
      prediction,
      "right",
      currentTime
    );

    // Return first detected rep (prioritize both arms, then left, then right) with debounce
    if (
      bothArmsRep &&
      currentTime - this.lastRepTime > ANALYSIS_CONFIG.REP_DEBOUNCE_MS
    ) {
      this.lastRepTime = currentTime;
      return {
        detected: true,
        armType: "both",
        timestamp: currentTime,
      };
    } else if (
      leftArmRep &&
      currentTime - this.lastRepTime > ANALYSIS_CONFIG.REP_DEBOUNCE_MS
    ) {
      this.lastRepTime = currentTime;
      return {
        detected: true,
        armType: "left",
        timestamp: currentTime,
      };
    } else if (
      rightArmRep &&
      currentTime - this.lastRepTime > ANALYSIS_CONFIG.REP_DEBOUNCE_MS
    ) {
      this.lastRepTime = currentTime;
      return {
        detected: true,
        armType: "right",
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

    // Require nose for reference point
    if (nose[2] < CONFIDENCE_THRESHOLD) {
      return false;
    }

    // Require at least one wrist to be detected with sufficient confidence
    return (
      leftWrist[2] >= CONFIDENCE_THRESHOLD ||
      rightWrist[2] >= CONFIDENCE_THRESHOLD
    );
  }

  private analyzeArmPattern(
    prediction: Prediction,
    armType: "left" | "right" | "both",
    currentTime: number
  ): boolean {
    // Check if required keypoints are available for this arm type
    const { keypoints } = prediction;
    const leftWrist = keypoints[COCO_KEYPOINTS.left_wrist];
    const rightWrist = keypoints[COCO_KEYPOINTS.right_wrist];

    if (armType === "both") {
      // For both arms, require both wrists to be detected
      if (
        leftWrist[2] < CONFIDENCE_THRESHOLD ||
        rightWrist[2] < CONFIDENCE_THRESHOLD
      ) {
        return false;
      }
    } else if (armType === "left") {
      // For left arm, only require left wrist
      if (leftWrist[2] < CONFIDENCE_THRESHOLD) {
        return false;
      }
    } else if (armType === "right") {
      // For right arm, only require right wrist
      if (rightWrist[2] < CONFIDENCE_THRESHOLD) {
        return false;
      }
    }

    const overhead = this.isArmOverhead(prediction, armType);
    const stateMachine = this.stateMachines[armType];

    switch (stateMachine.state) {
      case "ready":
        return this.handleReadyState(overhead, currentTime, armType);
      case "overhead":
        return this.handleOverheadState(overhead, currentTime, armType);
      case "complete":
        return this.handleCompleteState(overhead, currentTime, armType);
      default:
        return false;
    }
  }

  private isArmOverhead(
    prediction: Prediction,
    armType: "left" | "right" | "both"
  ): boolean {
    const { keypoints } = prediction;
    const leftWrist = keypoints[COCO_KEYPOINTS.left_wrist];
    const rightWrist = keypoints[COCO_KEYPOINTS.right_wrist];
    const nose = keypoints[COCO_KEYPOINTS.nose];

    if (armType === "both") {
      // Only check arms that have sufficient confidence
      const leftValid = leftWrist[2] >= CONFIDENCE_THRESHOLD;
      const rightValid = rightWrist[2] >= CONFIDENCE_THRESHOLD;

      // Both arms must be detected and overhead
      return (
        leftValid &&
        rightValid &&
        leftWrist[1] < nose[1] - 50 &&
        rightWrist[1] < nose[1] - 50
      );
    }

    const wrist = armType === "left" ? leftWrist : rightWrist;

    // Check if the specific arm has sufficient confidence before checking position
    if (wrist[2] < CONFIDENCE_THRESHOLD) {
      return false;
    }

    return wrist[1] < nose[1] - 50;
  }

  private handleReadyState(
    overhead: boolean,
    currentTime: number,
    armType: "left" | "right" | "both"
  ): boolean {
    const stateMachine = this.stateMachines[armType];
    if (overhead) {
      stateMachine.state = "overhead";
      stateMachine.lastStateChange = currentTime;
      stateMachine.repStartTime = currentTime;
      stateMachine.overheadDetectedTime = currentTime;
    }
    return false;
  }

  private handleOverheadState(
    overhead: boolean,
    currentTime: number,
    armType: "left" | "right" | "both"
  ): boolean {
    const stateMachine = this.stateMachines[armType];
    const holdTime = currentTime - stateMachine.overheadDetectedTime;

    if (holdTime > ANALYSIS_CONFIG.OVERHEAD_HOLD_MS) {
      stateMachine.state = "complete";
      stateMachine.lastStateChange = currentTime;
      stateMachine.belowHeadStartTime = 0;
      return true;
    } else if (!overhead) {
      stateMachine.state = "ready";
      stateMachine.lastStateChange = currentTime;
    }
    return false;
  }

  private handleCompleteState(
    overhead: boolean,
    currentTime: number,
    armType: "left" | "right" | "both"
  ): boolean {
    const stateMachine = this.stateMachines[armType];
    if (!overhead) {
      if (stateMachine.belowHeadStartTime === 0) {
        stateMachine.belowHeadStartTime = currentTime;
      }

      const belowHeadTime = currentTime - stateMachine.belowHeadStartTime;
      if (belowHeadTime > ANALYSIS_CONFIG.BELOW_HEAD_TIME_MS) {
        stateMachine.state = "ready";
        stateMachine.lastStateChange = currentTime;
        stateMachine.belowHeadStartTime = 0;
      }
    } else {
      stateMachine.belowHeadStartTime = 0;
    }
    return false;
  }
}
