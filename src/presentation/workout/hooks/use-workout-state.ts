import { useState, useEffect } from "preact/hooks";
import { useEventBus } from "../../hooks/use-event-bus";
import {
  SessionStateChangedEvent,
  SessionState,
} from "@/domain/events/session-events";
import { WorkoutUpdatedEvent } from "@/domain/events/workout-events";
import {
  WorkoutStatus,
  type WorkoutStats,
} from "@/domain/entities/workout-entity";

const DEFAULT_STATS: WorkoutStats = {
  status: WorkoutStatus.IDLE,
  startTime: null,
  endTime: null,
  isActive: false,
  repCount: 0,
  elapsedTime: 0,
  formattedTime: "00:00",
  averageRPM: 0,
  currentRPM: 0,
  reps: [],
};

export interface WorkoutSessionState {
  sessionState: SessionState;
  countdown?: number;
  stats: WorkoutStats;
}

export function useWorkoutState(): WorkoutSessionState {
  const [sessionState, setSessionState] = useState<SessionState>(
    SessionState.Idle
  );
  const [countdown, setCountdown] = useState<number | undefined>(undefined);
  const [stats, setStats] = useState<WorkoutStats>(DEFAULT_STATS);

  const { subscribe: subscribeSessionState } = useEventBus(
    SessionStateChangedEvent
  );
  const { subscribe: subscribeWorkoutUpdate } =
    useEventBus(WorkoutUpdatedEvent);

  useEffect(() => {
    const unsubscribe = subscribeSessionState((event) => {
      setSessionState(event.data.state);
      setCountdown(event.data.countdown);
    });

    return unsubscribe;
  }, [subscribeSessionState]);

  useEffect(() => {
    const unsubscribe = subscribeWorkoutUpdate((event) => {
      setStats(event.data.stats);
    });

    return unsubscribe;
  }, [subscribeWorkoutUpdate]);

  return {
    sessionState,
    countdown,
    stats,
  };
}
