# KB Sport App Architecture

## State Machine

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> PoseDetecting: startPreview()
    PoseDetecting --> Idle: stopPreview()
    PoseDetecting --> StartCountdown: startWorkout()
    StartCountdown --> Running: countdown complete (3s)
    Running --> Finished: stopWorkout()
    Finished --> Idle: reset()
```

## Component Architecture

```mermaid
flowchart TB
    UI[UI Components]
    WSM[WorkoutSessionManager]
    EventBus[EventBus]

    Camera[CameraAdapter]
    Pose[PredictionAdapter]
    Renderer[PredictionRendererAdapter]
    RepDetection[RepDetectionService]
    Storage[WorkoutStorageService]

    Workout[WorkoutEntity]

    UI -->|"calls methods"| WSM
    WSM -->|"emits events"| EventBus
    EventBus -->|"notifies"| UI

    WSM -->|"uses"| Camera
    WSM -->|"uses"| Pose
    WSM -->|"uses"| Renderer
    WSM -->|"uses"| RepDetection
    WSM -->|"uses"| Storage
    WSM -->|"manages"| Workout
```

## Event Flow

```mermaid
sequenceDiagram
    participant UI as UI Components
    participant WSM as WorkoutSessionManager
    participant EB as EventBus
    participant WE as WorkoutEntity

    UI->>WSM: startPreview(video, canvas)
    WSM->>EB: SessionStateChangedEvent(PoseDetecting)
    EB->>UI: Update state

    UI->>WSM: startWorkout()
    WSM->>EB: SessionStateChangedEvent(StartCountdown, 3)
    EB->>UI: Show countdown

    Note over WSM: Wait 1 second
    WSM->>EB: SessionStateChangedEvent(StartCountdown, 2)
    EB->>UI: Update countdown

    Note over WSM: Wait 1 second
    WSM->>EB: SessionStateChangedEvent(StartCountdown, 1)
    EB->>UI: Update countdown

    Note over WSM: Wait 1 second
    WSM->>WE: start()
    WSM->>EB: SessionStateChangedEvent(Running)
    WSM->>EB: WorkoutUpdatedEvent(stats)
    EB->>UI: Show stats, hide countdown

    loop Every frame (30 FPS)
        WSM->>WSM: processFrame()
        alt Rep detected
            WSM->>WE: addRep(rep)
            WSM->>EB: WorkoutUpdatedEvent(stats)
            EB->>UI: Update stats
        end
    end

    loop Every second
        WSM->>EB: WorkoutUpdatedEvent(stats)
        EB->>UI: Update timer
    end

    UI->>WSM: stopWorkout()
    WSM->>WE: stop()
    WSM->>EB: SessionStateChangedEvent(Finished)
    WSM->>EB: WorkoutUpdatedEvent(stats)
    EB->>UI: Show final stats

    UI->>WSM: reset()
    WSM->>EB: SessionStateChangedEvent(Idle)
    EB->>UI: Return to idle
```

## Directory Structure

```
src/
├── application/
│   ├── workout-session-manager.ts   # Main coordinator (NEW)
│   ├── events/
│   │   ├── camera-access-event.ts
│   │   └── model-loading-event.ts
│   └── services/
│       └── workout-storage.service.ts
│
├── domain/
│   ├── entities/
│   │   └── workout-entity.ts        # Pure data entity (UPDATED)
│   ├── events/
│   │   ├── session-events.ts        # Session state events (NEW)
│   │   └── workout-events.ts
│   ├── services/
│   │   ├── rep-detection.service.ts
│   │   └── rep-detection-state-machine.ts
│   └── types/
│       ├── rep-detection.types.ts
│       └── workout-storage.types.ts
│
├── infrastructure/
│   ├── adapters/
│   │   ├── camera.adapter.ts
│   │   ├── prediction.adapter.ts
│   │   └── prediction-renderer.adapter.ts
│   ├── event-bus/
│   │   ├── event-bus.ts
│   │   └── event.ts
│   ├── storage/
│   │   ├── opfs.adapter.ts
│   │   └── video-stream-writer.ts
│   └── model-loader.ts              # Simple model loader (NEW)
│
└── presentation/
    ├── app.tsx
    ├── hooks/
    │   ├── use-event-bus.ts
    │   └── use-model-loading.ts
    └── workout/
        ├── hooks/
        │   ├── use-workout-state.ts    # Subscribes to events (UPDATED)
        │   ├── use-workout-actions.ts  # Calls manager (UPDATED)
        │   └── use-frame-processing.ts # Now empty (UPDATED)
        └── components/
            ├── workout-controls.tsx    # Handles all states (UPDATED)
            └── workout-stats.tsx       # Shows during Running/Finished (UPDATED)
```

## Key Principles

### 1. Single Responsibility

- **WorkoutSessionManager**: Coordinates session lifecycle
- **WorkoutEntity**: Manages workout data and business rules
- **RepDetectionService**: Detects reps from pose predictions
- **Adapters**: Handle external concerns (camera, ML, rendering, storage)

### 2. Event-Driven

- All state changes emit events
- UI subscribes to events for reactive updates
- No direct coupling between layers

### 3. Type Safety

- TypeScript throughout
- Strict state machine transitions
- Type-safe event bus

### 4. Testability

- Pure domain logic (no side effects in entities)
- Dependency injection in manager
- Isolated state machine

## State Responsibilities

### Idle

- No camera active
- No workout data
- Waiting for user to start preview

### PoseDetecting

- Camera active
- Pose detection running
- Rendering skeleton overlay
- No rep counting
- No recording

### StartCountdown

- Countdown timer (3, 2, 1)
- Camera and pose detection still active
- Preparing to start workout

### Running

- Full workout active
- Rep detection enabled
- Video recording active
- Timer running
- Stats updating

### Finished

- Workout complete
- Stats displayed
- Video saved
- Waiting for reset
