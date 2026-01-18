import { type Rep } from "../types/rep-detection.types";

export enum WorkoutStatus {
  IDLE = "idle",
  ACTIVE = "active",
  STOPPED = "stopped",
}

export interface WorkoutStats {
  status: WorkoutStatus;
  startTime: Date | null;
  endTime: Date | null;
  isActive: boolean;
  repCount: number;
  elapsedTime: number;
  formattedTime: string;
  averageRPM: number;
  currentRPM: number;
  reps: Rep[];
}

/**
 * Core business entity representing a workout session.
 *
 * A workout can be in one of three states:
 * - IDLE: Initial state, ready to start
 * - ACTIVE: Currently running with timestamps
 * - STOPPED: Completed with start and end times
 *
 * Business rules:
 * - Cannot start an already active workout
 * - Cannot stop a workout that is not active
 * - Start time is set when transitioning to ACTIVE
 * - End time is set when transitioning to STOPPED
 */
export class WorkoutEntity {
  private _status: WorkoutStatus = WorkoutStatus.IDLE;
  private _startTime: Date | null = null;
  private _endTime: Date | null = null;
  private _reps: Rep[] = [];

  constructor(private _id: string) {}

  get id(): string {
    return this._id;
  }

  get status(): WorkoutStatus {
    return this._status;
  }

  get startTime(): Date | null {
    return this._startTime;
  }

  get endTime(): Date | null {
    return this._endTime;
  }

  get reps(): Rep[] {
    return this._reps;
  }

  getRepCount(): number {
    return this._reps.length;
  }

  addRep(rep: Rep): void {
    this._reps.push(rep);
  }

  isActive(): boolean {
    return this._status === WorkoutStatus.ACTIVE;
  }

  start(): void {
    if (this._status === WorkoutStatus.ACTIVE) {
      throw new Error("Cannot start workout that is already active");
    }
    this._status = WorkoutStatus.ACTIVE;
    this._startTime = new Date();
  }

  stop(): void {
    if (this._status !== WorkoutStatus.ACTIVE) {
      throw new Error("Cannot stop workout that is not active");
    }
    this._status = WorkoutStatus.STOPPED;
    this._endTime = new Date();
  }

  private getElapsedTime(): number {
    if (this._status === WorkoutStatus.IDLE || !this._startTime) {
      return 0;
    }
    
    if (this._status === WorkoutStatus.ACTIVE) {
      return Date.now() - this._startTime.getTime();
    }
    
    if (this._status === WorkoutStatus.STOPPED && this._endTime) {
      return this._endTime.getTime() - this._startTime.getTime();
    }
    
    return 0;
  }

  private getFormattedTime(): string {
    const elapsedMs = this.getElapsedTime();
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  private getAverageRPM(): number {
    if (this._reps.length === 0 || this._status === WorkoutStatus.IDLE) {
      return 0;
    }
    
    const elapsedMs = this.getElapsedTime();
    if (elapsedMs === 0) {
      return 0;
    }
    
    const elapsedMinutes = elapsedMs / 60000;
    return Math.round(this._reps.length / elapsedMinutes);
  }

  private getCurrentRPM(windowSeconds: number = 20): number {
    if (this._reps.length === 0 || this._status === WorkoutStatus.IDLE) {
      return 0;
    }
    
    const now = Date.now();
    const windowStart = now - (windowSeconds * 1000);
    
    // Filter reps within the window
    const repsInWindow = this._reps.filter(rep => 
      rep.timestamp.getTime() >= windowStart
    );
    
    if (repsInWindow.length === 0) {
      return 0;
    }
    
    // Calculate actual window duration
    // If workout started less than windowSeconds ago, use time since start
    const actualWindowStart = Math.max(windowStart, this._startTime!.getTime());
    const windowDurationMs = now - actualWindowStart;
    
    if (windowDurationMs === 0) {
      return 0;
    }
    
    const windowMinutes = windowDurationMs / 60000;
    return Math.round(repsInWindow.length / windowMinutes);
  }

  getStats(): WorkoutStats {
    const elapsedTime = this.getElapsedTime();
    const formattedTime = this.getFormattedTime();
    const averageRPM = this.getAverageRPM();
    const currentRPM = this.getCurrentRPM();
    
    return {
      status: this._status,
      startTime: this._startTime,
      endTime: this._endTime,
      isActive: this.isActive(),
      repCount: this.getRepCount(),
      elapsedTime,
      formattedTime,
      averageRPM,
      currentRPM,
      reps: this._reps,
    };
  }
}
