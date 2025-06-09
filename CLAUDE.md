# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development server
pnpm dev              # Start dev server with hot reload on all interfaces

# Build and validation
pnpm build            # TypeScript compile + Vite production build
tsc                   # TypeScript type checking only

# Preview
pnpm preview          # Preview production build locally
```

## Technology Stack

- **Frontend**: Preact + TypeScript + Vite
- **State Management**: Zustand (multi-store pattern)
- **ML Pipeline**: TensorFlow.js + YOLOv8 pose estimation model
- **Storage**: Origin Private File System (OPFS) for video files
- **Audio**: Web Audio API + Speech Synthesis API
- **Package Manager**: pnpm (required)

## Architecture Overview

### Multi-Store Pattern

- **Workout Store** (`src/shared/store/workout-store.ts`): UI state (countdown, errors, session data, settings)
- **Services Store** (`src/shared/store/services-store.ts`): Infrastructure coordination (service instances, timers, complex workflows)

### Service Layer Pattern

All business logic is extracted into pure service classes in `src/service/`:

- **PredictionService**: TensorFlow.js YOLOv8 model inference (60fps)
- **PredictionAnalysisService**: State machine for rep detection (ready → overhead → complete)
- **RepCountingService**: Session statistics and RPM calculation
- **StorageService**: OPFS operations (creates `{workoutId, videoWriter}` pairs)
- **RecordingService**: MediaRecorder API streaming to OPFS
- **AudioFeedbackService**: Workout-specific audio logic (application layer)
- **AudioService**: Low-level Web Audio API operations (infrastructure layer)
- **CameraService**: Camera access and stream management
- **SettingsService**: User preferences persistence

### Feature-Based Organization

Components are grouped by business functionality:

```
src/
├── features/
│   ├── workout/     # Real-time workout execution
│   └── sessions/    # Workout history management
├── shared/          # Reusable infrastructure
│   ├── store/       # Zustand stores
│   ├── types/       # TypeScript definitions
│   └── components/  # Reusable UI components
└── service/         # Business logic services
```

## Key Architectural Patterns

### Service Coordination

Services are coordinated through the Services Store, not direct coupling:

```typescript
// Store orchestrates multiple services
startWorkoutSession: async (video) => {
  const { storageService, recordingService } = get();
  const { workoutId, videoWriter } =
    await storageService.createWorkoutSession();
  await recordingService.startRecording(workoutId, stream, videoWriter);
};
```

### Component State Access

Components access state through selective Zustand subscriptions:

```typescript
// Efficient - only re-renders when specific state changes
const session = useWorkoutStore((state) => state.currentSession);
const { countdown, sessionEndCountdown } = useWorkoutCountdown();
```

### Hook Composition

Custom hooks combine store access and provide clean component APIs:

- `useWorkout()`: Main workout orchestration hook
- `useWorkoutActions()`: Action coordination (camera, countdown, session management)
- `useSessionsData()`: Session data fetching with loading states
- `useSessionActions()`: Session operations (view, download, delete)

## Real-Time Processing Pipeline

60fps computer vision pipeline:

```
Video Frame → PredictionService (YOLOv8) → PredictionAnalysisService (State Machine) → RepCountingService (Statistics) → WorkoutStore → UI Components
```

### Memory Management

- Use `tf.tidy()` for automatic tensor cleanup in ML operations
- Services dispose resources properly in `dispose()` methods
- Store actions clear timers and reset state on session end

## Browser API Dependencies

- **Camera Access**: Required for workout tracking
- **OPFS Support**: Chrome 86+, Firefox 111+, Safari 15.2+ for video storage
- **Web Audio API**: For beep generation and audio feedback
- **MediaRecorder API**: For workout video recording
- **Speech Synthesis API**: For voice announcements

## Service Interconnection Flow

1. **App Load**: Services Store initializes all service instances, loads YOLOv8 model (~6MB)
2. **Pre-Workout**: Camera access → countdown timer → audio feedback setup
3. **Session Start**: Storage session creation → recording start → processing loop start
4. **Real-Time Processing**: 60fps ML inference → rep detection → statistics update → audio feedback
5. **Session End**: Stop processing → save session data → cleanup resources

## Testing Strategy

- **Services**: Unit test business logic in isolation with mocked browser APIs
- **Stores**: Test state management and action coordination
- **Components**: Test UI with mocked store dependencies
- **Integration**: Test complete workflows through store orchestration

## Performance Requirements

- **Target**: 60fps real-time processing (16.67ms per frame)
- **Memory**: Efficient tensor cleanup to prevent GPU memory leaks
- **Bundle**: ~416KB JS + ~6MB ML model (loaded asynchronously)
- **Storage**: OPFS for video files, localStorage for settings
