# Application Workflow: From Load to Workout

This document traces the complete service interconnection flow from application startup through workout completion.

## 1. Application Startup

```mermaid
sequenceDiagram
    participant A as App.tsx
    participant WS as WorkoutStore
    participant SS as ServicesStore
    participant PS as PredictionService
    participant AS as AudioService
    participant STS as StorageService
    participant SETS as SettingsService

    A->>SS: Application mount
    SS->>SS: initializeServices()
    
    par Service Initialization
        SS->>PS: new PredictionService()
        SS->>AS: new AudioService()  
        SS->>STS: new StorageService()
        SS->>SETS: new SettingsService()
    end
    
    par Async Initialization
        PS->>PS: Load YOLOv8 model (~6MB)
        AS->>AS: Initialize AudioContext
        STS->>STS: Setup OPFS access
        SETS->>WS: Load user settings
    end
    
    SS->>WS: setServicesInitialized(true)
    WS->>A: Remove loading state
```

### Key Events:
1. **Services Store Creation**: All service instances created
2. **Parallel Initialization**: Services initialize independently
3. **Model Loading**: YOLOv8 loads asynchronously (~5-10 seconds)
4. **Settings Loading**: User preferences restored from localStorage
5. **Ready State**: UI shows workout controls

## 2. Pre-Workout Setup

```mermaid
sequenceDiagram
    participant U as User
    participant WP as WorkoutPage
    participant UW as useWorkout
    participant SS as ServicesStore
    participant CS as CameraService
    participant WS as WorkoutStore

    U->>WP: Clicks "Start Workout"
    WP->>UW: handleStartSession()
    UW->>SS: prepareCameraAndCanvas()
    
    SS->>CS: start(video, canvas)
    CS->>CS: getUserMedia() - Camera permission
    CS->>WS: Camera stream ready
    
    SS->>WS: setCountdown(3)
    loop Countdown
        WS->>WP: Update countdown display
        SS->>SS: setTimeout() - Next count
    end
    
    SS->>WS: setCountdown(null)
    SS->>SS: startWorkoutSession(video)
```

### Key Events:
1. **Camera Access**: Request user permission and setup video stream
2. **Canvas Setup**: Prepare rendering context for pose overlay
3. **Countdown Timer**: 3-second preparation countdown
4. **Audio Feedback**: Countdown beeps through AudioFeedbackService

## 3. Workout Session Start

```mermaid
sequenceDiagram
    participant SS as ServicesStore
    participant STS as StorageService
    participant RES as RecordingService
    participant RCS as RepCountingService
    participant PAS as PredictionAnalysisService
    participant AFS as AudioFeedbackService
    participant WS as WorkoutStore

    SS->>STS: createWorkoutSession()
    STS->>STS: Generate workoutId + videoWriter
    STS-->>SS: {workoutId, videoWriter}
    
    SS->>PAS: resetState()
    SS->>RCS: start()
    
    SS->>RES: startRecording(id, stream, writer)
    RES->>RES: Setup MediaRecorder
    
    RCS->>RCS: Initialize session data
    RCS-->>WS: Update currentSession
    
    SS->>AFS: startSession(session)
    AFS->>AFS: Setup milestone intervals
    
    SS->>SS: startProcessingLoop(video, canvas)
    SS->>WS: setSessionActive(true)
```

### Key Events:
1. **Storage Setup**: Create unique workout ID and video file writer
2. **Service Reset**: Clear previous state from analysis and counting services
3. **Recording Start**: Begin MediaRecorder streaming to OPFS
4. **Audio Setup**: Configure milestone beeps and announcements
5. **Processing Loop**: Start 60fps frame analysis pipeline

## 4. Real-Time Processing Loop

```mermaid
sequenceDiagram
    participant V as Video
    participant SS as ServicesStore  
    participant PS as PredictionService
    participant PAS as PredictionAnalysisService
    participant RCS as RepCountingService
    participant RS as RenderingService
    participant AFS as AudioFeedbackService
    participant WS as WorkoutStore

    loop Every Frame (60fps)
        V->>PS: Video frame
        PS->>PS: TensorFlow.js inference
        PS-->>SS: {bestPrediction, transformParams}
        
        alt Prediction available
            SS->>PAS: analyzeForRep(prediction)
            PAS->>PAS: State machine: ready→overhead→complete
            
            alt Rep detected
                PAS-->>SS: {detected: true, armType, timestamp}
                SS->>RCS: addRep(armType, timestamp)
                RCS->>RCS: Update statistics (RPM, total)
                RCS-->>WS: updateSession(newSession)
                
                SS->>AFS: handleSessionUpdate(session)
                alt Milestone reached
                    AFS->>AFS: playMilestoneBeep()
                    AFS->>AFS: announceProgress()
                end
            end
        end
        
        SS->>RS: render(canvas, video, prediction)
        RS->>RS: Draw pose keypoints + overlay
    end
```

### Key Events:
1. **ML Inference**: YOLOv8 processes each frame for pose keypoints
2. **Rep Detection**: State machine analyzes arm positions for exercise completion
3. **Statistics Update**: Rep counting service updates session data and RPM
4. **Audio Feedback**: Milestone beeps and progress announcements
5. **Visual Rendering**: Real-time pose overlay on video canvas

## 5. Session Management During Workout

```mermaid
sequenceDiagram
    participant SS as ServicesStore
    participant WS as WorkoutStore
    participant AFS as AudioFeedbackService
    participant RCS as RepCountingService

    alt Time-based milestones
        SS->>SS: setInterval() - Time beeps
        SS->>AFS: playBeep() every X seconds
    end
    
    alt Rep-based milestones  
        RCS->>WS: Session update (new rep)
        WS->>AFS: handleSessionUpdate()
        AFS->>AFS: Check rep intervals
        alt Milestone hit
            AFS->>AFS: playMilestoneBeep()
            AFS->>AFS: announceProgress(reps, rpm)
        end
    end
    
    alt Session duration limit
        SS->>SS: setupSessionTimer(duration)
        SS->>SS: setTimeout() - Session end warning
        SS->>WS: setSessionEndCountdown(3)
        loop End countdown
            AFS->>AFS: playCountdownBeep()
        end
        SS->>SS: handleSessionTimeout()
    end
```

### Key Events:
1. **Time Milestones**: Configurable beeps every X seconds
2. **Rep Milestones**: Audio feedback every X repetitions
3. **Progress Announcements**: Voice updates with rep count and RPM
4. **Session Timer**: Optional auto-stop after configured duration

## 6. Workout Session Stop

```mermaid
sequenceDiagram
    participant U as User
    participant WP as WorkoutPage
    participant SS as ServicesStore
    participant RES as RecordingService
    participant STS as StorageService
    participant RCS as RepCountingService
    participant AFS as AudioFeedbackService
    participant CS as CameraService
    participant WS as WorkoutStore

    alt Manual stop
        U->>WP: Click "Stop"
        WP->>SS: stopWorkoutSession()
    else Auto stop (time limit)
        SS->>SS: handleSessionTimeout()
        SS->>SS: stopWorkoutSession()
    end
    
    SS->>SS: stopProcessingLoop()
    SS->>SS: cancelAnimationFrame()
    
    SS->>RCS: stop()
    RCS-->>SS: finalSession
    
    SS->>RES: stopRecording() 
    RES-->>SS: {videoSize}
    
    SS->>STS: saveWorkout(id, session, size)
    STS->>STS: Write metadata.json to OPFS
    
    alt Manual stop
        SS->>AFS: endSession(session, true)
        AFS->>AFS: playManualStopSound()
    else Natural end
        SS->>AFS: endSession(session, false)
        AFS->>AFS: playSessionEndSequence()
    end
    
    SS->>CS: stop()
    CS->>CS: Release camera stream
    
    SS->>SS: clearSessionTimers()
    SS->>WS: resetSession()
    WS->>WP: Show completion state
```

### Key Events:
1. **Processing Stop**: Cancel animation frame loop and processing
2. **Session Finalization**: Get final statistics from RepCountingService  
3. **Recording Stop**: End MediaRecorder and get final video size
4. **Data Persistence**: Save session metadata and video to OPFS
5. **Audio Completion**: Different sounds for manual vs automatic stop
6. **Resource Cleanup**: Release camera, clear timers, reset state

## 7. Cleanup and Reset

```mermaid
sequenceDiagram
    participant SS as ServicesStore
    participant WS as WorkoutStore
    participant Services as All Services

    SS->>SS: clearSessionTimers()
    note over SS: sessionTimeoutId = null<br/>sessionEndCountdownId = null
    
    SS->>WS: resetSession()
    note over WS: currentSession = null<br/>isSessionActive = false<br/>countdown = null
    
    SS->>Services: Keep services alive
    note over Services: Services remain initialized<br/>for next workout
    
    WS->>WS: Ready for next workout
```

### Key Events:
1. **Timer Cleanup**: Clear all session-related timeouts
2. **State Reset**: Clear workout-specific state while preserving services
3. **Service Persistence**: Keep initialized services for immediate next use
4. **UI Reset**: Return to ready state for next workout

## Error Handling Throughout Workflow

### Service Initialization Errors
- **Model Loading Fails**: Show error, disable workout functionality
- **Camera Access Denied**: Show permission instructions
- **OPFS Not Supported**: Fallback to in-memory storage

### Runtime Errors
- **ML Inference Fails**: Continue with last known state, log warning
- **Recording Fails**: Continue workout, save metadata only
- **Storage Fails**: Keep session in memory, prompt for manual export

### Recovery Patterns
- **Graceful Degradation**: Non-critical features fail silently
- **User Feedback**: Clear error messages with recovery suggestions
- **State Consistency**: Always maintain valid application state

This workflow ensures robust service coordination while maintaining performance and user experience throughout the complete workout lifecycle.