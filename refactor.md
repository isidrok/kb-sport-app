# Preact Kettlebell App Refactoring Plan

## Overview

This document outlines a comprehensive refactoring strategy to transform the kettlebell workout application from a working but complex codebase into a production-ready, maintainable, and scalable application while preserving all existing functionality.

## Progress Status

### ✅ COMPLETED: Phase 1 - Feature Structure & Extract Utilities

**Implementation Date:** January 2025

**What was accomplished:**
1. **Feature-based directory structure created:**
   ```
   src/features/workout/components/    - workout-page.tsx, workout-settings.tsx
   src/features/workout/hooks/         - use-workout.ts
   src/features/workout/constants/     - workout-limits.ts
   src/features/sessions/components/   - sessions-page.tsx
   src/shared/components/ui/           - navigation.tsx
   src/shared/constants/               - storage-config.ts  
   src/shared/types/                   - workout-types.ts
   src/shared/utils/                   - formatting-utils.ts
   ```

2. **Successfully extracted and centralized:**
   - WorkoutSettings interface moved to `src/shared/types/workout-types.ts`
   - Storage configuration constants moved to `src/shared/constants/storage-config.ts`
   - Time/date formatting utilities moved to `src/shared/utils/formatting-utils.ts`
   - Workout limits constants moved to `src/features/workout/constants/workout-limits.ts`

3. **Updated all import paths across codebase:**
   - Updated app.tsx to use new feature paths
   - Updated all service files to use shared types
   - Updated component imports for new structure

4. **Removed old UI directory** and verified build/functionality still works

**Current codebase state:**
- ✅ Application builds successfully
- ✅ All existing functionality preserved  
- ✅ Clean feature-based organization implemented
- ✅ No breaking changes to user experience

**Current file structure after Phase 1:**
```
src/
├── features/
│   ├── workout/
│   │   ├── components/
│   │   │   ├── workout-page.tsx
│   │   │   ├── workout-page.module.css
│   │   │   ├── workout-settings.tsx
│   │   │   └── workout-settings.module.css
│   │   ├── hooks/
│   │   │   └── use-workout.ts (206 lines - needs refactoring)
│   │   └── constants/
│   │       └── workout-limits.ts
│   └── sessions/
│       ├── components/
│       │   ├── sessions-page.tsx
│       │   └── sessions-page.module.css
│       ├── hooks/ (empty - ready for new hooks)
│       └── utils/ (empty - ready for chart utils)
├── shared/
│   ├── components/ui/
│   │   ├── navigation.tsx
│   │   └── navigation.module.css
│   ├── constants/
│   │   └── storage-config.ts
│   ├── types/
│   │   └── workout-types.ts
│   ├── utils/
│   │   └── formatting-utils.ts
│   ├── hooks/ (empty - ready for shared hooks)
│   └── store/ (empty - ready for Zustand store)
├── service/ (unchanged)
├── utils/ (existing)
├── config/ (existing)
└── app.tsx (updated imports)
```

### 🔄 NEXT: Phase 2 - Centralized State Management

**Ready to implement:** Zustand store to replace callback-based state management

**Starting point for next session:**
1. Install Zustand: `pnpm add zustand`
2. Create `src/shared/store/workout-store.ts` 
3. Begin migrating useWorkout hook to use centralized store
4. Replace service callbacks with store updates

**Key files to focus on:**
- `src/features/workout/hooks/use-workout.ts` (206 lines - needs breaking down)
- `src/service/workout-orchestrator.service.ts` (callback-based communication)
- `src/features/workout/components/workout-page.tsx` (heavy component)

## Current Issues Analysis

### Component Architecture

- **Monolithic WorkoutPage**: Contains complex state logic, UI concerns, and business logic mixed together
- **Heavy useWorkout Hook**: 206 lines handling initialization, state management, countdown logic, and service orchestration
- **Inline Time Formatting**: Direct time calculations in JSX (WorkoutPage.tsx:50-62)
- **Mixed Concerns**: UI components directly managing service lifecycle and complex state

### State Management

- **No Centralized State**: Each component manages its own isolated state
- **Prop Drilling**: Settings passed through multiple component layers
- **Manual State Sync**: Services update UI through callbacks rather than reactive patterns
- **Local State Pollution**: UI-specific state (countdown, modals) mixed with business state

### Code Organization

- **Type Definitions Scattered**: WorkoutSettings in UI folder, types mixed with components
- **Utility Logic Inline**: Time formatting, data transformation in components
- **No Shared Constants**: Magic numbers and strings throughout codebase
- **Missing Error Boundaries**: No structured error handling at component level

## Proposed Architecture

### Feature-Based Structure

```
src/
├── features/
│   ├── workout/
│   │   ├── components/
│   │   │   ├── workout-page.tsx
│   │   │   ├── workout-metrics.tsx
│   │   │   ├── workout-controls.tsx
│   │   │   ├── workout-status.tsx
│   │   │   ├── control-buttons.tsx
│   │   │   └── workout-settings.tsx
│   │   ├── hooks/
│   │   │   ├── use-workout-session.ts
│   │   │   ├── use-workout-countdown.ts
│   │   │   ├── use-workout-orchestrator.ts
│   │   │   └── use-workout-actions.ts
│   │   └── constants/
│   │       └── workout-limits.ts
│   └── sessions/
│       ├── components/
│       │   ├── sessions-page.tsx
│       │   ├── session-card.tsx
│       │   ├── session-actions.tsx
│       │   └── rep-chart.tsx
│       ├── hooks/
│       │   ├── use-sessions-data.ts
│       │   └── use-session-actions.ts
│       └── utils/
│           └── chart-data-utils.ts
├── shared/
│   ├── components/
│   │   ├── ui/
│   │   │   ├── metric-display.tsx
│   │   │   ├── navigation.tsx
│   │   │   └── error-boundary.tsx
│   │   └── charts/
│   │       └── line-chart.tsx
│   ├── hooks/
│   │   ├── use-async-operation.ts
│   │   └── use-optimized-session.ts
│   ├── store/
│   │   └── workout-store.ts
│   ├── types/
│   │   ├── workout-types.ts
│   │   └── chart-types.ts
│   └── constants/
│       └── storage-config.ts
├── service/ (existing)
├── utils/ (existing)
└── config/ (existing)
```

### State Management Strategy

- **Zustand Store**: Lightweight, TypeScript-friendly state management
- **Reactive Patterns**: Services emit events, store reacts and updates
- **Separation of Concerns**: UI state vs business state clearly separated
- **Optimistic Updates**: Immediate UI feedback with background processing

## Detailed Refactoring Phases

### ✅ Phase 1: Create Feature Structure & Extract Utilities (COMPLETED)

**Status:** ✅ COMPLETED - January 2025

**Objectives:**
- Establish feature-based directory structure
- Extract time formatting and constants  
- Remove magic numbers and inline calculations

**✅ Implementation Completed:**
1. ✅ Created feature directories: `src/features/workout/` and `src/features/sessions/`
2. ✅ Created `src/shared/` for reusable components
3. ✅ Moved existing components to appropriate feature folders
4. ✅ Created utility files and extracted inline logic
5. ✅ Updated all import paths across codebase
6. ✅ Removed old `src/ui/` directory
7. ✅ Verified application builds and runs correctly

**New Files:**

```typescript
// src/shared/constants/storage-config.ts
export const STORAGE_CONFIG = {
  FILE_NAMES: {
    VIDEO: "recording.webm",
    METADATA: "metadata.json",
  },
  PREFIX: "workout_",
  SETTINGS_KEY: "workout_settings",
} as const;

// src/features/workout/constants/workout-limits.ts
export const WORKOUT_LIMITS = {
  MAX_COUNTDOWN: 30,
  MAX_SESSION_DURATION: 10800, // 3 hours
  MAX_BEEP_INTERVAL_REPS: 100,
  MAX_BEEP_INTERVAL_SECONDS: 600,
} as const;

// src/shared/utils/formatting-utils.ts
export const formatSessionTime = (startTime: number): string => {
  const elapsed = Date.now() - startTime;
  return formatDuration(elapsed);
};

export const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
```

**Risk Level:** Low
**Dependencies:** Add to package.json: None required

### 🔄 Phase 2: Centralized State Management (NEXT TO IMPLEMENT)

**Status:** 🔄 READY TO START

**Current Problems to Solve:**
- `src/features/workout/hooks/use-workout.ts` is 206 lines of mixed concerns
- Service-to-UI communication uses callbacks instead of reactive patterns
- No centralized state management - each component manages own state
- Settings and session state scattered across multiple components

**Objectives:**
- Implement Zustand store with separated concerns
- Replace callback-based service communication  
- Centralize application state
- Break down the massive useWorkout hook

**🚀 IMMEDIATE NEXT STEPS for next session:**

1. **Install Zustand:** `pnpm add zustand`

2. **Create the store file:** `src/shared/store/workout-store.ts`
   - Separate business state (session, settings) from UI state (countdown, loading)
   - Replace callback functions with store actions
   
3. **Key files that need modification:**
   - `src/features/workout/hooks/use-workout.ts` - break into smaller focused hooks
   - `src/service/workout-orchestrator.service.ts` - remove callbacks, use store instead
   - `src/features/workout/components/workout-page.tsx` - simplify by using store

4. **Migration strategy:** 
   - Keep existing useWorkout hook working alongside new store initially
   - Gradually move components to use store hooks
   - Remove old hooks once migration is complete

**New Files:**

```typescript
// src/shared/store/workout-store.ts
import { create } from "zustand";
import { WorkoutSession } from "../../service/rep-counting.service";
import { WorkoutSettings } from "../types/workout-types";

interface WorkoutState {
  // Business State
  currentSession: WorkoutSession | null;
  isSessionActive: boolean;
  settings: WorkoutSettings;

  // UI State
  countdown: number | null;
  sessionEndCountdown: number | null;
  error: string | null;
  isModelLoading: boolean;

  // Actions
  updateSession: (session: WorkoutSession | null) => void;
  updateSettings: (settings: WorkoutSettings) => void;
  setCountdown: (countdown: number | null) => void;
  setSessionEndCountdown: (countdown: number | null) => void;
  setError: (error: string | null) => void;
  setModelLoading: (loading: boolean) => void;
  setSessionActive: (active: boolean) => void;
}

export const useWorkoutStore = create<WorkoutState>((set) => ({
  // Initial state
  currentSession: null,
  isSessionActive: false,
  settings: {
    countdownDuration: 3,
    sessionDuration: null,
    autoStopOnTimeLimit: false,
    beepInterval: 0,
    beepUnit: "reps",
    announcementInterval: 0,
    announcementUnit: "seconds",
  },
  countdown: null,
  sessionEndCountdown: null,
  error: null,
  isModelLoading: true,

  // Actions
  updateSession: (session) => set({ currentSession: session }),
  updateSettings: (settings) => set({ settings }),
  setCountdown: (countdown) => set({ countdown }),
  setSessionEndCountdown: (sessionEndCountdown) => set({ sessionEndCountdown }),
  setError: (error) => set({ error }),
  setModelLoading: (isModelLoading) => set({ isModelLoading }),
  setSessionActive: (isSessionActive) => set({ isSessionActive }),
}));

// src/features/workout/hooks/use-workout-actions.ts
export const useWorkoutActions = () => {
  const orchestrator = useWorkoutOrchestrator();
  const { setError, setCountdown, setSessionActive } = useWorkoutStore();

  const startSession = useCallback(async () => {
    if (!orchestrator.current) return;

    try {
      setError(null);
      // Implementation details...
    } catch (error) {
      setError("Failed to start workout session. Please try again.");
    }
  }, [orchestrator, setError]);

  const stopSession = useCallback(async () => {
    if (!orchestrator.current) return;

    try {
      await orchestrator.current.stop();
      setSessionActive(false);
    } catch (error) {
      setError("Failed to stop workout session.");
    }
  }, [orchestrator, setSessionActive, setError]);

  return { startSession, stopSession };
};
```

**Risk Level:** Medium
**Dependencies:** `zustand`

### Phase 3: Component Decomposition by Feature

**Objectives:**

- Break down large components into focused, single-responsibility components
- Create reusable UI components
- Implement proper component composition

**Implementation Steps:**

1. Extract WorkoutMetrics component with MetricDisplay
2. Break down control section into focused components
3. Extract SessionCard and related components
4. Create shared UI components

**New Files:**

```typescript
// src/shared/components/ui/metric-display.tsx
interface MetricDisplayProps {
  value: string | number;
  label: string;
  className?: string;
}

export function MetricDisplay({ value, label, className }: MetricDisplayProps) {
  return (
    <div className={`${styles.metric} ${className || ""}`}>
      <div className={styles.metricValue}>{value}</div>
      <div className={styles.metricLabel}>{label}</div>
    </div>
  );
}

// src/features/workout/components/workout-metrics.tsx
import { MetricDisplay } from "../../../shared/components/ui/metric-display";
import { formatSessionTime } from "../../../shared/utils/formatting-utils";
import { WorkoutSession } from "../../../service/rep-counting.service";

interface WorkoutMetricsProps {
  session: WorkoutSession | null;
}

export const WorkoutMetrics = ({ session }: WorkoutMetricsProps) => {
  return (
    <div className={styles.overlayMetrics}>
      <MetricDisplay value={session?.totalReps || 0} label="Reps" />
      <MetricDisplay
        value={session ? Math.round(session.repsPerMinute) : 0}
        label="Avg RPM"
      />
      <MetricDisplay
        value={session ? formatSessionTime(session.startTime) : "00:00"}
        label="Time"
      />
      <MetricDisplay
        value={session?.estimatedRepsPerMinute || 0}
        label="Current RPM"
      />
    </div>
  );
};

// src/features/workout/components/workout-controls.tsx
import { WorkoutStatus } from "./workout-status";
import { ControlButtons } from "./control-buttons";
import { WorkoutSettings } from "./workout-settings";

export const WorkoutControls = () => {
  return (
    <div className={styles.controls}>
      <WorkoutStatus />
      <div className={styles.buttonRow}>
        <ControlButtons />
        <WorkoutSettings />
      </div>
    </div>
  );
};

// src/features/sessions/components/session-card.tsx
import { useState } from "preact/hooks";
import { SessionActions } from "./session-actions";
import { RepChart } from "./rep-chart";
import {
  formatDuration,
  formatDate,
} from "../../../shared/utils/formatting-utils";
import { WorkoutMetadata } from "../../../service/storage.service";

interface SessionCardProps {
  session: WorkoutMetadata;
  onView: () => void;
  onDownload: () => void;
  onDelete: () => void;
}

export function SessionCard({
  session,
  onView,
  onDownload,
  onDelete,
}: SessionCardProps) {
  const [showChart, setShowChart] = useState(false);

  return (
    <div className={styles.sessionCard}>
      <div className={styles.sessionHeader}>
        <div className={styles.sessionMeta}>
          <div className={styles.sessionDate}>
            {formatDate(session.timestamp)}
          </div>
          <div className={styles.sessionDuration}>
            {formatDuration(session.duration)}
          </div>
        </div>
        <div className={styles.sessionStats}>
          <div className={styles.sessionStat}>
            <span className={styles.sessionStatValue}>{session.totalReps}</span>
            <span className={styles.sessionStatLabel}>reps</span>
          </div>
          <div className={styles.sessionStat}>
            <span className={styles.sessionStatValue}>
              {Math.round(session.avgRepsPerMinute)}
            </span>
            <span className={styles.sessionStatLabel}>rpm</span>
          </div>
        </div>
      </div>

      <SessionActions
        onView={onView}
        onDownload={onDownload}
        onDelete={onDelete}
        onToggleChart={() => setShowChart(!showChart)}
        showChart={showChart}
        hasVideo={session.videoSize > 0}
      />

      {showChart && <RepChart session={session} />}
    </div>
  );
}
```

**Risk Level:** Medium
**Dependencies:** None

### Phase 4: Custom Hooks Refactoring

**Objectives:**

- Break down the 206-line useWorkout hook into focused hooks
- Separate concerns (session management, countdown, orchestrator lifecycle)
- Improve testability and reusability

**Implementation Steps:**

1. Extract countdown logic into dedicated hook
2. Create session management hook
3. Separate orchestrator lifecycle management
4. Create settings management hook
5. Compose hooks in components as needed

**New Files:**

```typescript
// src/features/workout/hooks/use-workout-session.ts
export const useWorkoutSession = () => {
  const session = useWorkoutStore((state) => state.currentSession);
  const isActive = useWorkoutStore((state) => state.isSessionActive);

  return { session, isActive };
};

// src/features/workout/hooks/use-workout-countdown.ts
export const useWorkoutCountdown = () => {
  const { countdown, setCountdown } = useWorkoutStore();
  const orchestrator = useWorkoutOrchestrator();
  const countdownIntervalRef = useRef<number | null>(null);

  const startCountdown = useCallback(
    async (duration: number) => {
      if (!orchestrator.current) return;

      let count = duration;
      if (count === 0) {
        startWorkout();
        return;
      }

      setCountdown(count);

      if (orchestrator.current) {
        orchestrator.current.playCountdownBeep();
      }

      countdownIntervalRef.current = window.setInterval(async () => {
        count--;
        if (count > 0) {
          setCountdown(count);
          if (orchestrator.current) {
            await orchestrator.current.playCountdownBeep();
          }
        } else {
          setCountdown(null);
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }

          if (orchestrator.current) {
            await orchestrator.current.playStartBeep();
          }
          startWorkout();
        }
      }, 1000);
    },
    [orchestrator, setCountdown]
  );

  const clearCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
      setCountdown(null);
    }
  }, [setCountdown]);

  return { countdown, startCountdown, clearCountdown };
};

// src/features/workout/hooks/use-workout-orchestrator.ts
export const useWorkoutOrchestrator = () => {
  const orchestratorRef = useRef<WorkoutOrchestratorService | null>(null);
  const { settings, updateSession, setSessionEndCountdown, setModelLoading } =
    useWorkoutStore();

  useEffect(() => {
    const initialize = async () => {
      try {
        const storageService = new StorageService();
        await storageService.initialize();

        const savedSettings = storageService.loadSettings();
        const defaultSettings = storageService.getDefaultSettings();
        const finalSettings = savedSettings
          ? { ...defaultSettings, ...savedSettings }
          : defaultSettings;

        orchestratorRef.current = new WorkoutOrchestratorService(
          finalSettings,
          (session) => updateSession(session),
          (countdown) => setSessionEndCountdown(countdown),
          () => {
            if (orchestratorRef.current) {
              orchestratorRef.current.stop();
              // Auto-stop logic
            }
          }
        );

        await orchestratorRef.current.initialize();
        setModelLoading(false);
      } catch (error) {
        console.error("Failed to initialize workout service:", error);
        setModelLoading(false);
      }
    };

    initialize();

    return () => {
      if (orchestratorRef.current) {
        orchestratorRef.current.dispose();
      }
    };
  }, []);

  return orchestratorRef;
};

// src/features/sessions/hooks/use-sessions-data.ts
export const useSessionsData = () => {
  const [sessions, setSessions] = useState<WorkoutMetadata[]>([]);
  const { data, loading, error, execute } =
    useAsyncOperation<WorkoutMetadata[]>();

  useEffect(() => {
    execute(async () => {
      const storageService = new StorageService();
      await storageService.initialize();
      return await storageService.getAllWorkouts();
    });
  }, [execute]);

  useEffect(() => {
    if (data) {
      setSessions(data);
    }
  }, [data]);

  return { sessions, loading, error };
};

// src/features/sessions/hooks/use-session-actions.ts
export const useSessionActions = () => {
  const [storageService] = useState(() => new StorageService());

  const viewRecording = useCallback(
    async (sessionId: string) => {
      try {
        const workout = await storageService.getWorkout(sessionId);
        if (workout?.videoBlob) {
          const videoUrl = URL.createObjectURL(workout.videoBlob);
          window.open(videoUrl, "_blank");
        }
      } catch (error) {
        console.error("Failed to view recording:", error);
      }
    },
    [storageService]
  );

  const downloadRecording = useCallback(
    async (sessionId: string) => {
      try {
        const workout = await storageService.getWorkout(sessionId);
        if (workout?.videoBlob) {
          const url = URL.createObjectURL(workout.videoBlob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `workout-${sessionId}.webm`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      } catch (error) {
        console.error("Failed to download recording:", error);
      }
    },
    [storageService]
  );

  const deleteSession = useCallback(
    async (sessionId: string, onSuccess: (id: string) => void) => {
      if (confirm("Are you sure you want to delete this session?")) {
        try {
          await storageService.deleteWorkout(sessionId);
          onSuccess(sessionId);
        } catch (error) {
          console.error("Failed to delete session:", error);
        }
      }
    },
    [storageService]
  );

  return { viewRecording, downloadRecording, deleteSession };
};
```

**Risk Level:** High (Most critical phase)
**Dependencies:** None

### Phase 5: Error Handling & Loading States

**Objectives:**

- Add error boundaries for graceful degradation
- Implement consistent loading state management
- Create better user feedback mechanisms

**Implementation Steps:**

1. Create error boundary components
2. Implement async operation hook for consistent loading states
3. Wrap main app sections with error boundaries
4. Replace manual loading/error state management with hook
5. Add error recovery mechanisms

**New Files:**

```typescript
// src/shared/components/ui/error-boundary.tsx
import { Component, ComponentChildren } from 'preact';

interface Props {
  children: ComponentChildren;
  fallback?: ComponentChildren;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className={styles.errorFallback}>
          <h2>Something went wrong</h2>
          <details>
            {this.state.error?.message}
          </details>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// src/shared/hooks/use-async-operation.ts
import { useState, useCallback } from 'preact/hooks';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export const useAsyncOperation = <T>() => {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (operation: () => Promise<T>) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const data = await operation();
      setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error as Error
      }));
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, execute, reset };
};

// src/features/workout/components/workout-error-fallback.tsx
interface WorkoutErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

export function WorkoutErrorFallback({ error, resetError }: WorkoutErrorFallbackProps) {
  return (
    <div className={styles.errorContainer}>
      <div className={styles.errorIcon}>⚠️</div>
      <h3>Workout Error</h3>
      <p>Failed to initialize workout features: {error.message}</p>
      <div className={styles.errorActions}>
        <button onClick={resetError} className={styles.retryButton}>
          Try Again
        </button>
        <button
          onClick={() => window.location.reload()}
          className={styles.refreshButton}
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
}
```

**Risk Level:** Low
**Dependencies:** None

### Phase 6: Performance Optimization

**Objectives:**

- Eliminate unnecessary re-renders
- Optimize expensive calculations
- Add proper memoization

**Implementation Steps:**

1. Add React.memo to appropriate components
2. Implement useMemo for expensive calculations
3. Optimize chart data generation
4. Add useCallback for event handlers
5. Profile and measure performance improvements

**New Files:**

```typescript
// src/shared/hooks/use-optimized-session.ts
import { useMemo } from "preact/hooks";
import { useWorkoutStore } from "../store/workout-store";
import { formatSessionTime } from "../utils/formatting-utils";

export const useOptimizedSession = () => {
  const session = useWorkoutStore((state) => state.currentSession);

  const metrics = useMemo(() => {
    if (!session) return null;

    return {
      formattedTime: formatSessionTime(session.startTime),
      avgRpm: Math.round(session.repsPerMinute),
      currentRpm: session.estimatedRepsPerMinute || 0,
      totalReps: session.totalReps,
    };
  }, [
    session?.startTime,
    session?.repsPerMinute,
    session?.estimatedRepsPerMinute,
    session?.totalReps,
  ]);

  return { session, metrics };
};

// src/features/sessions/utils/chart-data-utils.ts
import { WorkoutMetadata, Rep } from "../../../service/storage.service";

export const generateRepChartData = (
  reps: Rep[],
  sessionStart: number,
  duration: number
) => {
  const repsPerMinute = new Map<number, number>();

  reps.forEach((rep) => {
    const minute = Math.floor((rep.timestamp - sessionStart) / 60000);
    repsPerMinute.set(minute, (repsPerMinute.get(minute) || 0) + 1);
  });

  const totalMinutes = Math.ceil(duration / 60000);
  const chartData: Array<{ minute: number; reps: number }> = [];

  for (let i = 0; i < totalMinutes; i++) {
    chartData.push({
      minute: i + 1,
      reps: repsPerMinute.get(i) || 0,
    });
  }

  return chartData;
};

// src/features/sessions/components/optimized-rep-chart.tsx
import { memo, useMemo } from "preact/hooks";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { generateRepChartData } from "../utils/chart-data-utils";
import { WorkoutMetadata } from "../../../service/storage.service";

interface OptimizedRepChartProps {
  session: WorkoutMetadata;
}

export const OptimizedRepChart = memo(({ session }: OptimizedRepChartProps) => {
  const chartData = useMemo(
    () =>
      generateRepChartData(session.reps, session.timestamp, session.duration),
    [session.reps, session.timestamp, session.duration]
  );

  return (
    <div className={styles.chart}>
      <div className={styles.chartTitle}>Reps per Minute</div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="minute" tickFormatter={(value: any) => `${value}m`} />
          <YAxis />
          <Tooltip
            labelFormatter={(value: any) => `Minute ${value}`}
            formatter={(value: any) => [`${value}`, "Reps"]}
          />
          <Line
            type="monotone"
            dataKey="reps"
            stroke="var(--primary-color)"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});
```

**Risk Level:** Low
**Dependencies:** None

## Migration Plan & Risk Mitigation

### Safe Implementation Order

1. **Phase 1: Feature Structure & Utilities** (Low Risk)

   - Create directory structure
   - Extract constants and utilities
   - No breaking changes to existing functionality

2. **Phase 2: State Management** (Medium Risk)

   - Add Zustand alongside existing state
   - Gradually migrate components
   - Keep existing hooks as fallback

3. **Phase 3: Component Decomposition** (Medium Risk)

   - Extract components while maintaining existing APIs
   - Test each component in isolation

4. **Phase 4: Hook Refactoring** (High Risk)

   - Most critical phase requiring careful testing
   - Implement new hooks alongside existing ones
   - Switch components one at a time

5. **Phase 5: Error Handling** (Low Risk)

   - Add error boundaries without changing logic
   - Enhance existing error handling

6. **Phase 6: Performance** (Low Risk)
   - Optimization on top of working refactored code

### Risk Mitigation Strategies

- **Feature Flags**: Use environment variables to toggle between old/new implementations
- **Incremental Testing**: Test each phase thoroughly before proceeding
- **Rollback Strategy**: Keep original code commented until confident in new implementation
- **User Testing**: Validate real-time analysis still works correctly after each phase
- **Automated Testing**: Write tests for critical user flows before refactoring
- **Performance Monitoring**: Measure performance before and after each phase

### Testing Strategy

- **Unit Tests**: Test individual hooks and utility functions
- **Component Tests**: Test component rendering and user interactions
- **Integration Tests**: Test feature workflows end-to-end
- **Prformance Tests**: Measure real-time analysis performance
- **Browser API Tests**: Ensure camera, audio, and OPFS integrations work correctly

## Benefits After Refactoring

### Developer Experience

- **Easier Navigation**: Related code is grouped together by feature
- **Better Encapsulation**: Features are self-contained
- **Clearer Dependencies**: Shared vs feature-specific code is obvious
- **Simpler Testing**: Test entire features in isolation
- **Future Scaling**: Easy to add new features without cluttering shared folders

### Code Quality

- **Single Responsibility**: Each component and hook has one clear purpose
- **Type Safety**: Comprehensive TypeScript types throughout
- **Error Handling**: Graceful degradation and user feedback
- **Performance**: Optimized rendering and calculations
- **Maintainability**: Clear patterns and conventions

### User Experience

- **Reliability**: Better error handling and recovery
- **Performance**: Faster rendering and smoother interactions
- **Consistency**: Unified UI patterns and behaviors
- **Accessibility**: Proper focus management and screen reader support

This refactoring plan transforms the working but complex codebase into a production-ready, maintainable, and scalable application while preserving all existing real-time analysis functionality.
