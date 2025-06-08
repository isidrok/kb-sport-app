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

interface BodyPosition {
  leftWrist: [number, number, number];
  rightWrist: [number, number, number];
  nose: [number, number, number];
  timestamp: number;
}

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
  confidence: number;
}

export class PredictionAnalysisService {
  private positionHistory: BodyPosition[] = [];
  private leftArmMachine: ArmStateMachine = this.createInitialState();
  private rightArmMachine: ArmStateMachine = this.createInitialState();
  private bothArmsMachine: ArmStateMachine = this.createInitialState();
  private lastRepTime = 0;

  resetState(): void {
    this.positionHistory = [];
    this.leftArmMachine = this.createInitialState();
    this.rightArmMachine = this.createInitialState();
    this.bothArmsMachine = this.createInitialState();
    this.lastRepTime = 0;
  }

  analyzeForRep(prediction: Prediction): RepDetection {
    const currentTime = Date.now();

    // Extract key body positions
    const bodyPosition = this.extractBodyPosition(prediction, currentTime);
    if (!bodyPosition) {
      return {
        detected: false,
        armType: "both",
        timestamp: currentTime,
        confidence: 0,
      };
    }

    // Update position history
    this.updatePositionHistory(bodyPosition);

    // Check all patterns - debounce will prevent double counting
    const bothArmsRep = this.analyzeArmPattern(
      bodyPosition,
      this.bothArmsMachine,
      "both",
      currentTime
    );
    const leftArmRep = this.analyzeArmPattern(
      bodyPosition,
      this.leftArmMachine,
      "left",
      currentTime
    );
    const rightArmRep = this.analyzeArmPattern(
      bodyPosition,
      this.rightArmMachine,
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
        confidence: 0.8,
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
        confidence: 0.8,
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
        confidence: 0.8,
      };
    }

    return {
      detected: false,
      armType: "both",
      timestamp: currentTime,
      confidence: 0,
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

  private extractBodyPosition(
    prediction: Prediction,
    timestamp: number
  ): BodyPosition | null {
    const { keypoints } = prediction;

    const leftWrist = keypoints[COCO_KEYPOINTS.left_wrist];
    const rightWrist = keypoints[COCO_KEYPOINTS.right_wrist];
    const nose = keypoints[COCO_KEYPOINTS.nose];

    // Check if key points are visible
    if (
      leftWrist[2] < CONFIDENCE_THRESHOLD ||
      rightWrist[2] < CONFIDENCE_THRESHOLD ||
      nose[2] < CONFIDENCE_THRESHOLD
    ) {
      return null;
    }

    return {
      leftWrist: leftWrist as [number, number, number],
      rightWrist: rightWrist as [number, number, number],
      nose: nose as [number, number, number],
      timestamp,
    };
  }

  private updatePositionHistory(newPosition: BodyPosition): void {
    this.positionHistory.push(newPosition);

    if (this.positionHistory.length > ANALYSIS_CONFIG.SMOOTHING_WINDOW) {
      this.positionHistory.shift();
    }
  }

  private analyzeArmPattern(
    bodyPosition: BodyPosition,
    machine: ArmStateMachine,
    armType: "left" | "right" | "both",
    currentTime: number
  ): boolean {
    // Calculate if the arm(s) are overhead (above head level)
    let overhead: boolean;

    if (armType === "both") {
      const leftOverhead =
        bodyPosition.leftWrist[1] < bodyPosition.nose[1] - 50;
      const rightOverhead =
        bodyPosition.rightWrist[1] < bodyPosition.nose[1] - 50;
      overhead = leftOverhead && rightOverhead;
    } else {
      const wristKey = armType === "left" ? "leftWrist" : "rightWrist";
      overhead = bodyPosition[wristKey][1] < bodyPosition.nose[1] - 50;
    }

    switch (machine.state) {
      case "ready":
        if (overhead) {
          machine.state = "overhead";
          machine.lastStateChange = currentTime;
          machine.repStartTime = currentTime;
          machine.overheadDetectedTime = currentTime;
        }
        break;

      case "overhead":
        // Count rep after holding overhead position for at least 150ms
        const holdTime = currentTime - machine.overheadDetectedTime;

        if (holdTime > ANALYSIS_CONFIG.OVERHEAD_HOLD_MS) {
          // Held long enough - rep complete!
          machine.state = "complete";
          machine.lastStateChange = currentTime;
          machine.belowHeadStartTime = 0; // Reset for tracking
          return true; // Rep counted immediately
        } else if (!overhead) {
          // Lost overhead position before completing hold - reset
          machine.state = "ready";
          machine.lastStateChange = currentTime;
        }
        break;

      case "complete":
        // Wait for arm to come down and stay below head before allowing next rep
        if (!overhead) {
          if (machine.belowHeadStartTime === 0) {
            // Just came below head, start timing
            machine.belowHeadStartTime = currentTime;
          }

          const belowHeadTime = currentTime - machine.belowHeadStartTime;

          if (belowHeadTime > ANALYSIS_CONFIG.BELOW_HEAD_TIME_MS) {
            // Stayed below head long enough, ready for next rep
            machine.state = "ready";
            machine.lastStateChange = currentTime;
            machine.belowHeadStartTime = 0;
          }
        } else {
          // Arm went back overhead, reset the below-head timer
          machine.belowHeadStartTime = 0;
        }
        break;
    }

    return false;
  }
}
