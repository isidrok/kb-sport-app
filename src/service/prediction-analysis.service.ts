import { Prediction } from "./prediction.service";
import { COCO_KEYPOINTS } from "../config/coco-keypoints";

const ANALYSIS_CONFIG = {
    CONFIDENCE_THRESHOLD: 0.3,
    ERROR_MARGIN: 0.4,
    DEBOUNCE_MS: 500,
    // Anchor points for analysis
    LEFT_ARM_ANCHOR: COCO_KEYPOINTS.left_wrist,
    RIGHT_ARM_ANCHOR: COCO_KEYPOINTS.right_wrist,
    HEAD_ANCHOR: COCO_KEYPOINTS.nose,
} as const;

interface ArmThresholds {
    left: number;
    right: number;
}

interface ArmStatus {
    left: boolean;
    right: boolean;
}

export interface RepDetection {
    detected: boolean;
    armType: "left" | "right" | "both";
    timestamp: number;
}

export class PredictionAnalysisService {
    private thresholds: ArmThresholds | null = null;
    private lastRepTime = 0;
    private leftArmInThreshold = false;
    private rightArmInThreshold = false;

    setThresholds(thresholds: ArmThresholds): void {
        this.thresholds = { ...thresholds };
    }

    hasThresholds(): boolean {
        return this.thresholds !== null;
    }

    getThresholds(): ArmThresholds | null {
        return this.thresholds ? { ...this.thresholds } : null;
    }

    resetState(): void {
        this.lastRepTime = 0;
        this.leftArmInThreshold = false;
        this.rightArmInThreshold = false;
    }

    analyzeForRep(prediction: Prediction): RepDetection {
        if (!this.thresholds) {
            return { detected: false, armType: "left", timestamp: Date.now() };
        }

        const currentTime = Date.now();
        const armStatus = this.getArmStatus(prediction);

        // Global debounce check
        if (currentTime - this.lastRepTime < ANALYSIS_CONFIG.DEBOUNCE_MS) {
            this.updateArmState(armStatus);
            return { detected: false, armType: "left", timestamp: currentTime };
        }

        // Check if any arm entered threshold
        const leftEntered = armStatus.left && !this.leftArmInThreshold;
        const rightEntered = armStatus.right && !this.rightArmInThreshold;

        let repDetected = false;
        let armType: "left" | "right" | "both" = "left";

        // Prioritize "both" rep when both arms enter threshold simultaneously
        if (leftEntered && rightEntered) {
            repDetected = true;
            armType = "both";
            this.lastRepTime = currentTime;
        }
        // Single arm reps
        else if (leftEntered) {
            repDetected = true;
            armType = "left";
            this.lastRepTime = currentTime;
        }
        else if (rightEntered) {
            repDetected = true;
            armType = "right";
            this.lastRepTime = currentTime;
        }

        this.updateArmState(armStatus);

        return {
            detected: repDetected,
            armType,
            timestamp: currentTime,
        };
    }

    getArmStatus(prediction: Prediction): ArmStatus {
        if (!this.thresholds) {
            return { left: false, right: false };
        }

        const { keypoints } = prediction;
        const leftArmAnchor = keypoints[ANALYSIS_CONFIG.LEFT_ARM_ANCHOR];
        const rightArmAnchor = keypoints[ANALYSIS_CONFIG.RIGHT_ARM_ANCHOR];

        return {
            left: this.isArmInThreshold(leftArmAnchor, this.thresholds.left),
            right: this.isArmInThreshold(rightArmAnchor, this.thresholds.right),
        };
    }

    // Private helper methods
    private updateArmState(armStatus: ArmStatus): void {
        this.leftArmInThreshold = armStatus.left;
        this.rightArmInThreshold = armStatus.right;
    }

    private isArmInThreshold(armAnchor: number[], threshold: number): boolean {
        const armVisible = armAnchor[2] > ANALYSIS_CONFIG.CONFIDENCE_THRESHOLD;

        if (!armVisible) return false;

        const errorMargin = threshold * ANALYSIS_CONFIG.ERROR_MARGIN;
        return Math.abs(armAnchor[1] - threshold) <= errorMargin;
    }
} 