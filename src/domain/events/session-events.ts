import { Event } from "@/infrastructure/event-bus/event";

/**
 * Represents the current state of the workout session.
 */
export enum SessionState {
  Idle = "idle",
  PoseDetecting = "pose_detecting",
  StartCountdown = "start_countdown",
  Running = "running",
  StopCountdown = "stop_countdown",
  Finished = "finished",
}

/**
 * Event emitted when the session state changes.
 *
 * Contains the new state and optional countdown value during StartCountdown state.
 * Stats are sent separately via WorkoutUpdatedEvent.
 */
export class SessionStateChangedEvent extends Event<{
  state: SessionState;
  countdown?: number;
}> {}
