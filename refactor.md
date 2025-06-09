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

### ✅ COMPLETED: Phase 2 - Centralized State Management

**Implementation Date:** January 2025

**What was accomplished:**

1. **Installed Zustand:** Added `zustand@5.0.5` for centralized state management
2. **Created centralized store:** `src/shared/store/workout-store.ts` with separated business and UI state
3. **Refactored orchestrator service:** Updated to use store callbacks instead of component props
4. **Created focused hooks:**
   - `useWorkoutOrchestrator` - handles service initialization and lifecycle
   - `useWorkoutActions` - manages workout actions and countdown logic
   - `useWorkout` - main hook combining store selectors and actions
5. **Updated WorkoutPage:** Now uses Zustand store through clean hook interface

**Key improvements:**

- Eliminated 206-line monolithic useWorkout hook
- Replaced callback-based service communication with reactive store updates
- Centralized all workout state management
- Fixed infinite loop issues with proper dependency management
- Maintained all existing functionality while improving code organization

**Current codebase state:**

- ✅ Application builds successfully with Zustand integration
- ✅ All existing functionality preserved with centralized state
- ✅ No infinite loops or performance issues
- ✅ Clean separation between business logic and UI state

### ✅ COMPLETED: Phase 2.5 - Service-Hook Architecture Review

**Implementation Date:** January 2025

**What was accomplished:**

1. **Created SettingsService** - Extracted settings logic from StorageService for proper separation of concerns
2. **Refactored AudioFeedbackService** - Removed countdown and auto-stop logic, now purely audio operations
3. **Moved Auto-Stop Logic to Services Store** - Session duration management and auto-stop now handled in coordination layer
4. **Consolidated Hooks** - Removed redundant `use-workout-orchestrator` and `use-services` hooks
5. **Fixed Countdown Logic** - Single countdown system in UI layer, audio service responds to calls
6. **Direct Store Access** - Components access services directly from store instead of through hook abstractions
7. **Removed WorkoutOrchestratorService** - Completely eliminated, replaced with store-based coordination

**Key improvements:**

- Pure service architecture with clear responsibilities
- No duplicate countdown/timer logic
- Proper separation: settings ≠ file storage, audio ≠ business logic
- Direct store access pattern eliminates unnecessary abstractions
- Auto-stop functionality properly placed in coordination layer
- All existing functionality preserved with cleaner architecture

**Current codebase state:**

- ✅ Application builds successfully with pure services architecture
- ✅ All existing functionality preserved (camera, recording, audio, sessions)
- ✅ No duplicate service instances or countdown logic
- ✅ Clean separation of concerns between services and coordination
- ✅ Services are pure utilities, coordination in store layer

**Architecture Achievements:**

The service-hook architecture has been completely refactored with these major improvements:

1. **Pure Services**: All services are now focused utilities with single responsibilities
2. **Store-Based Coordination**: Business logic coordination moved from orchestrator to store
3. **Eliminated Redundancies**: Single service instances shared across entire application
4. **Clean Separation**: UI concerns in UI layer, business logic in store, pure operations in services
5. **Direct Access Pattern**: No unnecessary hook abstractions, direct store access

### 🔄 NEXT: Phase 3 - Component Decomposition by Feature

**Ready to implement:** Break down monolithic components into focused, reusable pieces

## Current Issues Analysis

### Component Architecture

**Implementation Steps:**

1. **Create Services Store** (`src/shared/store/services-store.ts`)

   - Centralize service initialization and lifecycle
   - Manage service instances as global state
   - Handle service initialization errors

2. **Create Service Access Hook** (`src/shared/hooks/use-services.ts`)

   - Provide simple interface to access services
   - Handle initialization lifecycle
   - Manage cleanup on unmount

3. **Refactor Existing Hooks:**

   - `useWorkoutOrchestrator` - Use services store instead of creating instances
   - `useSessionsData` - Access StorageService from store
   - `useSessionActions` - Reuse existing StorageService instance

4. **Update Workout Store Integration:**
   - Services store communicates directly with workout store
   - Remove callback parameters from service constructors
   - Use direct store method calls for updates

**Benefits:**

1. **Eliminate Redundancy:**

   - Single StorageService instance shared across app
   - Single OrchestratorService instance managed centrally
   - No duplicate service initializations

2. **Simplified Hook Logic:**

   - Hooks focus on business logic, not service management
   - Consistent service access pattern across features
   - Easier testing with centralized service mocking

3. **Better Performance:**

   - Reduced memory usage from fewer service instances
   - Faster initialization by avoiding redundant setups
   - More predictable service lifecycle

4. **Improved Maintainability:**
   - Single source of truth for service configuration
   - Easier to add new services or modify existing ones
   - Clear separation between service layer and UI layer

**Migration Strategy:**

1. **Phase 2.5a**: Create services store alongside existing hooks
2. **Phase 2.5b**: Update hooks to use services store, test individually
3. **Phase 2.5c**: Remove old service creation logic
4. **Phase 2.5d**: Verify all functionality works with centralized services

**Risk Level:** Medium
**Dependencies:** None (builds on existing Zustand store)

**Testing Focus:**

- Ensure services initialize correctly
- Verify service sharing doesn't cause conflicts
- Test service disposal on app unmount
- Validate all existing functionality preserved

## Workout Orchestrator Analysis

### Current Orchestrator Problems:

1. **God Object Pattern** - Too many responsibilities mixed together
2. **UI Coupling** - Manages UI concerns (callbacks, countdowns) that belong in hooks
3. **Limited Reusability** - Hard to test individual coordination logic
4. **Service Composition Issues** - StorageService unnecessarily wraps RecordingService

### Service Independence Analysis:

#### ✅ **Independent Services** (No coordination needed):

- **CameraService** - Pure utility for camera stream management
- **AudioService** - Pure utility for audio operations
- **PredictionService** - Stateless ML model processor
- **RenderingService** - Pure utility for canvas rendering
- **RepCountingService** - Independent session state manager
- **PredictionAnalysisService** - Stateful but independent processor

#### 🔧 **Services Needing Refactoring**:

- **StorageService** - Remove RecordingService composition, focus on file operations
- **AudioFeedbackService** - Remove UI callbacks, focus on audio coordination
- **RecordingService** - Extract from StorageService to independent manager

#### 🔄 **Legitimate Coordination Needs**:

1. **Animation Frame Pipeline**: Prediction → Analysis → RepCounting → UI Updates
2. **Session Lifecycle**: Start/stop coordination across RepCounting, Storage, AudioFeedback
3. **Settings Synchronization**: Propagate settings to all relevant services

### Recommended Architecture: **Store-Based Service Management**

Replace orchestrator with store actions and pure services

### Migration Strategy for Phase 2.5:

1. **Phase 2.5a: Extract Pure Services**

   - Refactor StorageService to remove RecordingService composition
   - Remove UI callbacks from AudioFeedbackService
   - Create independent RecordingService

2. **Phase 2.5b: Create Services Store**

   - Move service instances to centralized store
   - Implement coordination actions in store
   - Keep orchestrator temporarily for comparison

3. **Phase 2.5c: Move Animation Loop to Hook**

   - Extract frame processing to custom hook using services store
   - Remove frame processing from orchestrator
   - Test processing pipeline works correctly

4. **Phase 2.5d: Remove Orchestrator**
   - Update hooks to use services store directly
   - Remove WorkoutOrchestratorService completely
   - Verify all functionality preserved

### Benefits of This Approach:

1. **Better Separation of Concerns** - UI logic stays in UI layer, business logic in store
2. **Improved Testability** - Each service and coordination action can be tested independently
3. **Better Reusability** - Services become pure utilities usable in different contexts
4. **Clearer Dependencies** - Store actions make coordination logic explicit
5. **Easier Debugging** - Clear data flow through store instead of hidden in orchestrator

**Conclusion: Remove the orchestrator and move coordination to store-based management.**

### 🔄 NEXT: Phase 3 - Component Decomposition by Feature

**Ready to implement:** Break down monolithic components into focused, reusable pieces

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
