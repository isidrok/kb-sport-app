import { Rep, WorkoutSession } from "../shared/types/workout-types";

const SESSION_CONFIG = {
  RPM_WINDOW_MS: 60000, // 1 minute window for RPM calculation
  MAX_RPM_LIMIT: 60, // Maximum realistic RPM
} as const;

export class RepCountingService {
  private session: WorkoutSession | null = null;

  start(): void {
    this.session = {
      startTime: Date.now(),
      reps: [],
      totalReps: 0,
      repsPerMinute: 0,
      estimatedRepsPerMinute: 0,
    };
  }

  stop(): WorkoutSession | null {
    const finalSession = this.session;
    this.session = null;
    return finalSession;
  }

  getCurrentSession(): WorkoutSession | null {
    return this.session;
  }

  isSessionActive(): boolean {
    return this.session !== null;
  }

  addRep(
    armType: "left" | "right" | "both",
    timestamp: number = Date.now()
  ): void {
    if (!this.session) return;

    const rep: Rep = { timestamp, armType };

    this.session.reps.push(rep);
    this.session.totalReps++;
    this.updateRepsPerMinute();
    this.session.estimatedRepsPerMinute = this.calculateEstimatedRPM();
  }

  getSessionStats(): {
    duration: number;
    totalReps: number;
    repsPerMinute: number;
    estimatedRepsPerMinute: number;
  } | null {
    if (!this.session) return null;

    const currentTime = Date.now();
    const duration = currentTime - this.session.startTime;

    return {
      duration,
      totalReps: this.session.totalReps,
      repsPerMinute: this.session.repsPerMinute,
      estimatedRepsPerMinute: this.session.estimatedRepsPerMinute,
    };
  }

  // Private helper methods
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

  private calculateEstimatedRPM(): number {
    if (!this.session || this.session.reps.length < 2) {
      return this.session?.reps.length || 0;
    }

    const currentTime = Date.now();
    const recentReps = this.getRecentReps(currentTime);

    if (recentReps.length < 2) {
      return recentReps.length;
    }

    const averageInterval = this.calculateAverageInterval(recentReps);

    return averageInterval
      ? Math.min(
          Math.round(SESSION_CONFIG.RPM_WINDOW_MS / averageInterval),
          SESSION_CONFIG.MAX_RPM_LIMIT
        )
      : recentReps.length;
  }

  private getRecentReps(currentTime: number): Rep[] {
    if (!this.session) return [];

    return this.session.reps.filter(
      (rep) => currentTime - rep.timestamp <= SESSION_CONFIG.RPM_WINDOW_MS
    );
  }

  private calculateAverageInterval(reps: Rep[]): number {
    const intervals: number[] = [];

    for (let i = 1; i < reps.length; i++) {
      intervals.push(reps[i].timestamp - reps[i - 1].timestamp);
    }

    return (
      intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length
    );
  }
}
