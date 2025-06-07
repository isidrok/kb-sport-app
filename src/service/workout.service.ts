import { Prediction } from './prediction.service';

export interface Rep {
  timestamp: number;
  handType: 'left' | 'right' | 'both';
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
  left_wrist: 9,
  right_wrist: 10,
} as const;

export class WorkoutService {
  private session: WorkoutSession | null = null;
  private lastHandPositions: { left: boolean; right: boolean } = { left: false, right: false };
  private readonly CONFIDENCE_THRESHOLD = 0.3;
  private readonly REP_COOLDOWN_MS = 500; // Prevent double counting
  private lastRepTime = 0;
  
  startSession(): void {
    this.session = {
      startTime: Date.now(),
      reps: [],
      totalReps: 0,
      repsPerMinute: 0,
    };
    this.lastHandPositions = { left: false, right: false };
    this.lastRepTime = 0;
  }

  processPose(prediction: Prediction): void {
    if (!this.session) {
      console.log('WorkoutService: No active session');
      return;
    }

    const { keypoints } = prediction;
    
    // Get nose position with confidence check
    const noseKeypoint = keypoints[KEYPOINT_INDICES.nose];
    console.log('WorkoutService: Nose keypoint:', noseKeypoint, 'confidence:', noseKeypoint[2]);
    
    if (noseKeypoint[2] < this.CONFIDENCE_THRESHOLD) {
      console.log('WorkoutService: Nose confidence too low:', noseKeypoint[2], 'threshold:', this.CONFIDENCE_THRESHOLD);
      return;
    }
    
    const noseY = noseKeypoint[1];
    
    // Get hand positions with confidence checks
    const leftWrist = keypoints[KEYPOINT_INDICES.left_wrist];
    const rightWrist = keypoints[KEYPOINT_INDICES.right_wrist];
    
    console.log('WorkoutService: Left wrist:', leftWrist, 'Right wrist:', rightWrist);
    console.log('WorkoutService: Nose Y:', noseY);
    
    const leftHandOverNose = leftWrist[2] > this.CONFIDENCE_THRESHOLD && leftWrist[1] < noseY;
    const rightHandOverNose = rightWrist[2] > this.CONFIDENCE_THRESHOLD && rightWrist[1] < noseY;
    
    console.log('WorkoutService: Left hand over nose:', leftHandOverNose, 'Right hand over nose:', rightHandOverNose);
    console.log('WorkoutService: Last positions - Left:', this.lastHandPositions.left, 'Right:', this.lastHandPositions.right);
    
    // Check cooldown period to prevent double counting
    const currentTime = Date.now();
    if (currentTime - this.lastRepTime < this.REP_COOLDOWN_MS) {
      console.log('WorkoutService: In cooldown period, time since last rep:', currentTime - this.lastRepTime, 'ms');
      this.lastHandPositions.left = leftHandOverNose;
      this.lastHandPositions.right = rightHandOverNose;
      return;
    }
    
    // Detect rep transitions (hand going from below nose to above nose)
    const leftRepDetected = !this.lastHandPositions.left && leftHandOverNose;
    const rightRepDetected = !this.lastHandPositions.right && rightHandOverNose;
    
    console.log('WorkoutService: Rep detection - Left:', leftRepDetected, 'Right:', rightRepDetected);
    
    if (leftRepDetected || rightRepDetected) {
      const handType = leftRepDetected && rightRepDetected ? 'both' 
                      : leftRepDetected ? 'left' 
                      : 'right';
      
      console.log('WorkoutService: Rep detected!', handType);
      this.addRep(handType);
      this.lastRepTime = currentTime;
    }
    
    // Update last positions
    this.lastHandPositions.left = leftHandOverNose;
    this.lastHandPositions.right = rightHandOverNose;
  }

  private addRep(handType: 'left' | 'right' | 'both'): void {
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
    const sessionDurationMinutes = (currentTime - this.session.startTime) / (1000 * 60);
    
    if (sessionDurationMinutes > 0) {
      this.session.repsPerMinute = this.session.totalReps / sessionDurationMinutes;
    }
  }

  getCurrentSession(): WorkoutSession | null {
    return this.session;
  }

  endSession(): WorkoutSession | null {
    const finalSession = this.session;
    this.session = null;
    return finalSession;
  }
}