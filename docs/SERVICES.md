# Services Guide

## Service Overview

All services are pure business logic classes with single responsibilities, coordinated through the Services Store.

## Computer Vision Pipeline

### PredictionService
```typescript
class PredictionService {
  async initialize()    // Load YOLOv8 model
  process(video)        // 60fps pose inference
  dispose()            // GPU memory cleanup
}
```
- **Responsibility**: TensorFlow.js model inference
- **Input**: Video frames
- **Output**: 17 COCO pose keypoints + confidence scores

### PredictionAnalysisService
```typescript
class PredictionAnalysisService {
  resetState()                     // Reset detection state
  analyzeForRep(prediction)        // State machine for rep detection
  getCurrentState()                // Get current analysis state
}
```
- **Responsibility**: Exercise detection state machine
- **States**: `ready → overhead → complete`
- **Output**: Rep detection events with confidence

### RepCountingService
```typescript
class RepCountingService {
  start()              // Begin workout session
  addRep(armType, timestamp)  // Record detected rep
  getCurrentSession()  // Get live session data
  stop()              // End session, return final data
}
```
- **Responsibility**: Session statistics and RPM calculation
- **Tracks**: Total reps, RPM (real-time + average), duration

## Media Management

### CameraService
```typescript
class CameraService {
  async start(video)   // Request camera access
  stop()              // Release camera stream
  isActive()          // Check camera status
}
```
- **Responsibility**: Camera access and stream management
- **Configuration**: 30fps optimal for ML processing

### StorageService
```typescript
class StorageService {
  async initialize()                    // Setup OPFS access
  async createWorkoutSession()          // Generate ID + video writer
  async saveWorkout(id, session, size)  // Save session metadata
  async getAllWorkouts()                // Load workout history
}
```
- **Responsibility**: OPFS file operations and metadata
- **Storage**: Video files + JSON metadata per workout

### RecordingService
```typescript
class RecordingService {
  async startRecording(id, stream, writer)  // Begin video recording
  async stopRecording()                     // End recording, return size
  dispose()                                // Cleanup resources
}
```
- **Responsibility**: MediaRecorder API operations
- **Format**: WebM video streamed directly to OPFS

## User Experience

### AudioFeedbackService (Application Layer)
```typescript
class AudioFeedbackService {
  startSession(session)           // Setup session audio
  handleSessionUpdate(session)    // Trigger milestone sounds
  endSession(session, manual)     // Play completion sounds
}
```
- **Responsibility**: Workout-specific audio logic
- **Features**: Rep milestones, progress announcements, session events

### AudioService (Infrastructure Layer)
```typescript
class AudioService {
  async playBeep(freq, duration, volume)  // Generate beep sounds
  async speak(text, rate, pitch)          // Text-to-speech
  isAudioAvailable()                      // Check browser support
}
```
- **Responsibility**: Low-level Web Audio API operations
- **Capabilities**: Beep synthesis, speech synthesis, feature detection

### SettingsService
```typescript
class SettingsService {
  async loadSettings()        // Load from localStorage
  async saveSettings(config)  // Persist user preferences
}
```
- **Responsibility**: User preference persistence
- **Storage**: JSON in localStorage

## Service Dependencies

### No Dependencies (Pure)
- `CameraService` - Direct browser API access
- `AudioService` - Direct Web Audio API access
- `PredictionService` - Direct TensorFlow.js operations

### Store Dependencies
- `AudioFeedbackService` - Uses AudioService internally
- `StorageService` - Independent OPFS operations
- `RecordingService` - Uses MediaRecorder API

### Coordination Dependencies (via Store)
- `RepCountingService` → updates → `WorkoutStore`
- `PredictionAnalysisService` → triggers → `RepCountingService`
- All services → coordinated by → `ServicesStore`

## Error Handling

### Service-Level Errors
```typescript
// Each service handles its own errors
async initialize() {
  try {
    // Service-specific initialization
  } catch (error) {
    throw new Error(`ServiceName: ${error.message}`);
  }
}
```

### Store-Level Coordination
```typescript
// Store handles coordination errors
initializeServices: async () => {
  try {
    // Initialize all services
    set({ servicesInitialized: true });
  } catch (error) {
    set({ initializationError: error.message });
  }
}
```

## Testing Strategy

### Unit Testing
- Test each service independently
- Mock external dependencies (browser APIs)
- Verify business logic correctness

### Integration Testing  
- Test service coordination through store
- Test complete workflows end-to-end
- Verify error handling and recovery

### Performance Testing
- Monitor frame processing times
- Check memory usage and cleanup
- Validate real-time performance requirements