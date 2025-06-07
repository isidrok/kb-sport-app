import { Prediction } from "./prediction.service";
import { COCO_KEYPOINTS } from "../config/coco-keypoints";

const ANALYSIS_CONFIG = {
    CONFIDENCE_THRESHOLD: 0.3,
    SMOOTHING_WINDOW: 3,
    OVERHEAD_HOLD_MS: 150,
    BELOW_HEAD_TIME_MS: 300,
    REP_DEBOUNCE_MS: 800,
} as const;

type RepState = 'ready' | 'overhead' | 'complete';

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

    setThresholds(): void {
        // Not needed for position-based detection
    }

    hasThresholds(): boolean {
        return true;
    }

    getThresholds(): null {
        return null;
    }

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
            return { detected: false, armType: "both", timestamp: currentTime, confidence: 0 };
        }

        // Update position history
        this.updatePositionHistory(bodyPosition);

        // Check if both arms are overhead to prevent individual arm detection
        const leftOverhead = bodyPosition.leftWrist[1] < bodyPosition.nose[1] - 50;
        const rightOverhead = bodyPosition.rightWrist[1] < bodyPosition.nose[1] - 50;
        const bothArmsOverhead = leftOverhead && rightOverhead;

        // Check if either arm is already in progress (overhead or complete state)
        const leftInProgress = this.leftArmMachine.state === 'overhead' || this.leftArmMachine.state === 'complete';
        const rightInProgress = this.rightArmMachine.state === 'overhead' || this.rightArmMachine.state === 'complete';

        // If one arm is in progress and the other goes overhead, treat as both-arms movement
        const shouldTreatAsBoth = bothArmsOverhead ||
            (leftOverhead && rightInProgress) ||
            (rightOverhead && leftInProgress);

        // Check for both arms pattern first
        const bothArmsRep = this.analyzeArmPattern(bodyPosition, this.bothArmsMachine, 'both', currentTime);

        if (bothArmsRep && currentTime - this.lastRepTime > ANALYSIS_CONFIG.REP_DEBOUNCE_MS) {
            // Reset individual arm machines to prevent double counting
            this.leftArmMachine = this.createInitialState();
            this.rightArmMachine = this.createInitialState();
            this.lastRepTime = currentTime;
            console.log('🏋️ BOTH ARMS REP DETECTED! (Reset individual arms)');
            return {
                detected: true,
                armType: "both",
                timestamp: currentTime,
                confidence: 0.8,
            };
        }

        // Only check individual arms if we shouldn't treat this as both-arms movement
        if (!shouldTreatAsBoth) {
            const leftArmRep = this.analyzeArmPattern(bodyPosition, this.leftArmMachine, 'left', currentTime);
            const rightArmRep = this.analyzeArmPattern(bodyPosition, this.rightArmMachine, 'right', currentTime);

            if (leftArmRep && currentTime - this.lastRepTime > ANALYSIS_CONFIG.REP_DEBOUNCE_MS) {
                this.lastRepTime = currentTime;
                console.log('🏋️ LEFT ARM REP DETECTED!');
                return {
                    detected: true,
                    armType: "left",
                    timestamp: currentTime,
                    confidence: 0.8,
                };
            } else if (rightArmRep && currentTime - this.lastRepTime > ANALYSIS_CONFIG.REP_DEBOUNCE_MS) {
                this.lastRepTime = currentTime;
                console.log('🏋️ RIGHT ARM REP DETECTED!');
                return {
                    detected: true,
                    armType: "right",
                    timestamp: currentTime,
                    confidence: 0.8,
                };
            }
        } else if (shouldTreatAsBoth) {
            // Should treat as both-arms - reset individual machines and ensure both-arms machine is active
            if (leftInProgress || rightInProgress) {
                console.log('🔄 Converting individual arm movement to both-arms movement');
                this.leftArmMachine = this.createInitialState();
                this.rightArmMachine = this.createInitialState();

                // Kickstart both-arms machine if not already active
                if (this.bothArmsMachine.state === 'ready' && bothArmsOverhead) {
                    this.bothArmsMachine.state = 'overhead';
                    this.bothArmsMachine.lastStateChange = currentTime;
                    this.bothArmsMachine.repStartTime = currentTime;
                    this.bothArmsMachine.overheadDetectedTime = currentTime;
                    console.log('🔄 Starting both-arms detection');
                }
            }
        }

        return { detected: false, armType: "both", timestamp: currentTime, confidence: 0 };
    }

    private createInitialState(): ArmStateMachine {
        return {
            state: 'ready',
            lastStateChange: Date.now(),
            repStartTime: 0,
            overheadDetectedTime: 0,
            belowHeadStartTime: 0,
        };
    }

    private extractBodyPosition(prediction: Prediction, timestamp: number): BodyPosition | null {
        const { keypoints } = prediction;

        const leftWrist = keypoints[COCO_KEYPOINTS.left_wrist];
        const rightWrist = keypoints[COCO_KEYPOINTS.right_wrist];
        const nose = keypoints[COCO_KEYPOINTS.nose];

        // Check if key points are visible
        if (leftWrist[2] < ANALYSIS_CONFIG.CONFIDENCE_THRESHOLD ||
            rightWrist[2] < ANALYSIS_CONFIG.CONFIDENCE_THRESHOLD ||
            nose[2] < ANALYSIS_CONFIG.CONFIDENCE_THRESHOLD) {
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

    private analyzeArmPattern(bodyPosition: BodyPosition, machine: ArmStateMachine, armType: "left" | "right" | "both", currentTime: number): boolean {
        // Calculate if the arm(s) are overhead (above head level)
        let overhead: boolean;
        let logInfo: any;

        if (armType === 'both') {
            const leftOverhead = bodyPosition.leftWrist[1] < bodyPosition.nose[1] - 50;
            const rightOverhead = bodyPosition.rightWrist[1] < bodyPosition.nose[1] - 50;
            overhead = leftOverhead && rightOverhead;
            logInfo = {
                state: machine.state,
                leftOverhead,
                rightOverhead,
                bothOverhead: overhead,
                leftWristY: bodyPosition.leftWrist[1].toFixed(1),
                rightWristY: bodyPosition.rightWrist[1].toFixed(1),
                noseY: bodyPosition.nose[1].toFixed(1),
                threshold: (bodyPosition.nose[1] - 50).toFixed(1)
            };
        } else {
            const wristKey = armType === 'left' ? 'leftWrist' : 'rightWrist';
            overhead = bodyPosition[wristKey][1] < bodyPosition.nose[1] - 50;
            logInfo = {
                state: machine.state,
                overhead,
                wristY: bodyPosition[wristKey][1].toFixed(1),
                noseY: bodyPosition.nose[1].toFixed(1),
                threshold: (bodyPosition.nose[1] - 50).toFixed(1)
            };
        }

        console.log(`${armType.toUpperCase()} Arm Analysis:`, logInfo);

        switch (machine.state) {
            case 'ready':
                if (overhead) {
                    machine.state = 'overhead';
                    machine.lastStateChange = currentTime;
                    machine.repStartTime = currentTime;
                    machine.overheadDetectedTime = currentTime;
                    console.log(`🔄 State: READY → OVERHEAD`);
                }
                break;

            case 'overhead':
                // Count rep after holding overhead position for at least 150ms
                const holdTime = currentTime - machine.overheadDetectedTime;

                if (holdTime > ANALYSIS_CONFIG.OVERHEAD_HOLD_MS) {
                    // Held long enough - rep complete!
                    machine.state = 'complete';
                    machine.lastStateChange = currentTime;
                    machine.belowHeadStartTime = 0; // Reset for tracking
                    console.log(`✅ REP COMPLETED AT TOP!`, { holdTime });
                    return true; // Rep counted immediately
                } else if (!overhead) {
                    // Lost overhead position before completing hold - reset
                    console.log(`❌ Lost overhead position too early, hold time was:`, holdTime, 'ms (needed', ANALYSIS_CONFIG.OVERHEAD_HOLD_MS, 'ms)');
                    machine.state = 'ready';
                    machine.lastStateChange = currentTime;
                }
                break;

            case 'complete':
                // Wait for arm to come down and stay below head before allowing next rep
                if (!overhead) {
                    if (machine.belowHeadStartTime === 0) {
                        // Just came below head, start timing
                        machine.belowHeadStartTime = currentTime;
                        console.log(`⬇️ ${armType.toUpperCase()} Arms came down, starting below-head timer`);
                    }

                    const belowHeadTime = currentTime - machine.belowHeadStartTime;

                    if (belowHeadTime > ANALYSIS_CONFIG.BELOW_HEAD_TIME_MS) {
                        // Stayed below head long enough, ready for next rep
                        machine.state = 'ready';
                        machine.lastStateChange = currentTime;
                        machine.belowHeadStartTime = 0;
                        console.log(`🔄 ${armType.toUpperCase()} Ready for next rep after`, belowHeadTime, 'ms below head');
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