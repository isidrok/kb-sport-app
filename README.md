# KV Sport App

A workout tracking application that uses computer vision to automatically detect and count exercise repetitions in real-time using your webcam. **Works entirely in your browser** - no installation required, no data leaves your device.

## Quick Start Checklist

✅ Open the app in your browser  
✅ Allow camera access  
✅ Go to Settings → Set audio beep to **every 1 rep**  
✅ Test: Raise your hand above your head and listen for beep  
✅ Get comfortable with detection before your workout  
✅ If device is slow: Lower FPS to 6-8 in Settings  
✅ Stand upright for best detection  
✅ Start your workout!

## What It Tracks

This app counts **any overhead lift** where your wrist goes above your nose. The more upright your position, the better the detection works.

**The detection is simple**: when your wrist crosses above your nose for a set threshold, it counts as a rep.

## Privacy First

- **Everything runs in your browser** - no data is sent to any server
- **All recordings stay on your device** - stored locally in [OPFS](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system)
- **No account needed** - no tracking, no analytics, no data collection

## Features

- **Real-Time Rep Detection**: Uses [YOLOv8](https://yolov8.com/) pose estimation to track body movements
- **Automatic Counting**: Detects when your wrist crosses above your nose
- **Video Recording**: Optional recording of workout sessions (stored locally)
- **Workout History**: View and analyze past workouts with detailed statistics
- **Audio Feedback**: Configurable beeps to keep you informed during workouts
- **Adjustable FPS**: Lower FPS on slower devices to improve performance

## How to Use the App

### Access the App

🌐 **[Open the app here](https://isidrok.github.io/kb-sport-app/)**

### Requirements

- **Webcam** access
- **Single person only** - only works with one person in camera frame
- **Stable position** - the more upright you are, the better detection works

### Getting Started

1. **First Time Setup**:
   - Allow camera access when prompted
   - Start preview mode clicking on the eye icon.
   - Get familiar with how it detects movements before your workout

### Starting a Workout

1. **Position Yourself**:

   - Stand upright in front of your camera
   - Ensure your head and arms are fully visible in the frame
   - **Make sure you're alone in the camera frame** - detection only works with one person
   - **The more upright you stand, the better the detection works**

2. **Test First** (Recommended):

   - Click **Start Workout** with audio beeps set to every 1 rep
   - Raise your hand above your head slowly
   - Listen for the beep when your wrist crosses above your nose
   - Get comfortable with the detection before your actual workout

3. **Start Your Workout**:

   - Click the **Start Workout** button
   - A countdown will begin (default: 5 seconds)
   - The app starts tracking your movements

4. **Perform Your Overhead Lifts**:

   - Any overhead movement works
   - The app counts a rep when your wrist crosses above your nose
   - You'll see the rep count increase in real-time
   - Audio feedback (beeps) will play based on your settings

5. **End the Workout**:
   - Click the **Stop Workout** button
   - If auto-stop is configured, the workout will end automatically
   - Your workout is automatically saved to history (stored locally on your device)

### Viewing Workout History

1. Click the **History** button (clock icon) at the top of the screen
2. Browse through your past workouts
3. Click on any workout card to view detailed statistics:
   - Total reps and duration
   - Reps per minute chart
   - Hand distribution (left/right)
   - Video playback (if recorded)
4. Delete workouts by clicking the delete icon and confirming

### Configuring Settings

Click the **Settings** button (gear icon) to customize:

#### Workout Settings

- **Start Countdown**: Delay before workout begins (0-30 seconds)
- **Auto-Stop Time**: Automatically stop after a set duration (optional)
- **Stop Countdown**: Warning countdown before auto-stop (optional)
- **FPS**: Detection frame rate (1-60 fps) - lower values save CPU/battery

#### Recording Settings

- **Record Video**: Enable/disable video recording
- **Video Format**: Choose between WebM or MP4
- **Video Quality**: Low, Medium, High, or Very High

#### Audio Feedback

- **Enable Audio**: Toggle beep sounds
- **Rep Interval**: Beep every X reps (optional)
- **Time Interval**: Beep at time intervals (optional)

### Tips for Best Results

- **Test First**: Set beeps to every 1 rep and test the detection before your actual workout
- **One Person Only**: Make sure only one person is visible in the camera frame
- **Stand Upright**: The more vertical your position, the better the detection accuracy
- **Slow Device?**: Lower the FPS in Settings (try 6-8 FPS) to improve performance
- **Lighting**: Ensure good lighting for better pose detection
- **Camera Position**: Keep your head and arms fully visible in the frame
- **Video Recording**: Disable recording if you don't need it - improves performance and saves storage

## How It Works

### Core Principle

**Everything runs in your browser** using TensorFlow.js and the YOLOv8-Pose model. No servers, no data transmission, no cloud processing. Your camera feed is processed locally in real-time to detect when your wrist crosses above your nose - that's it!

### Architecture Overview

The app follows a **Clean Architecture** pattern with clear separation of concerns:

```
src/
├── domain/          # Business logic and entities
├── application/     # Use cases and orchestration
├── infrastructure/  # External adapters (storage, camera, etc.)
└── presentation/    # UI components (Preact)
```

### Key Components

#### 1. **Pose Detection Pipeline**

The app uses **YOLOv8-Pose**, a state-of-the-art computer vision model:

1. **Camera Feed**: Captures video frames from your webcam
2. **Model Processing**: YOLOv8 detects 17 body keypoints including:
   - Nose (keypoint 0)
   - Left wrist (keypoint 9)
   - Right wrist (keypoint 10)
3. **Coordinate Extraction**: Extracts 2D coordinates (x, y) and confidence scores
4. **Rep Detection**: Analyzes keypoint positions to determine if a rep occurred

#### 2. **Rep Detection State Machine**

The `RepDetectionStateMachine` implements a finite state machine with three states:

- **IDLE**: Waiting for wrist to move up
- **HAND_UP**: Wrist is raised above nose level
- **HAND_TOUCHING_NOSE**: Wrist has crossed the nose threshold (rep completed!)

**Detection Logic (Simple & Effective):**

- Tracks both left and right wrist positions relative to your nose
- Counts a rep when your wrist crosses above your nose for a set threshold
- Works for **any overhead lift**
- Requires minimum confidence threshold (0.3) for reliable detection
- Prevents double-counting with state transitions
- Identifies which hand performed the rep

#### 3. **Workout Session Manager**

The central coordinator that orchestrates:

- **Camera lifecycle**: Start/stop video stream
- **Prediction loop**: Continuous pose detection at configured FPS
- **Rep counting**: Processes detections and updates workout state
- **Video recording**: Captures and saves workout videos
- **Audio feedback**: Triggers beeps based on settings
- **Data persistence**: Saves workouts to local storage

#### 4. **Data Flow**

```
Camera → Video Frame → YOLOv8 Model → Keypoints →
Rep Detection → State Machine → Workout Entity →
UI Update + Storage + Audio Feedback
```

#### 5. **Storage & Persistence (100% Local)**

- **Local Storage**: Uses browser's `localStorage` for settings
- **OPFS**: Stores workout data and video recordings on your device
- **No Server Communication**: Everything happens in your browser - zero data transmission
- **Your Data Stays Yours**: No accounts, no cloud storage, no external servers

#### 6. **Technology Stack**

- **Frontend**: Preact (lightweight React alternative)
- **AI/ML**: TensorFlow.js with YOLOv8-Pose model
- **Charting**: Recharts for workout analytics
- **Build Tool**: Vite for fast development and optimized builds
- **Testing**: Vitest with Testing Library
- **Language**: TypeScript for type safety

### Performance Considerations

- **FPS Control**: Adjustable frame rate to balance detection accuracy vs. CPU usage
  - **Device running slow?** Lower FPS to 6-8 in Settings
  - Start with 12 FPS and adjust based on your device's performance
- **Lazy Loading**: YOLOv8 model loads asynchronously on app start
- **Event-Driven**: Uses event bus pattern to decouple components
- **Efficient Rendering**: Preact's small footprint (~3KB) ensures fast UI updates
- **Video Compression**: Configurable quality settings to manage storage
- **Offline-First**: Works without internet after initial load

## Development

### Local Development Setup

1. Clone the repository:

```bash
git clone https://github.com/isidrok/kb-sport-app.git
cd kb-sport-app
```

2. Install dependencies:

```bash
pnpm install
```

3. Start development server:

```bash
pnpm dev
```

### Available Scripts

```bash
pnpm dev              # Start development server with hot reload
pnpm build            # Build for production
pnpm preview          # Preview production build
pnpm test             # Run unit tests
pnpm test:ui          # Run tests with UI
pnpm test:coverage    # Generate test coverage report
pnpm tsc              # Type check without emitting
```

### Project Structure

```
src/
├── application/           # Application services and use cases
│   ├── events/           # Application-level events
│   ├── model-loader.ts   # AI model loading service
│   └── workout-session-manager.ts  # Main workout coordinator
├── domain/               # Core business logic
│   ├── entities/        # Domain entities (Workout, Settings)
│   ├── events/          # Domain events
│   ├── repositories/    # Repository interfaces
│   ├── services/        # Domain services (rep detection)
│   └── types/           # Type definitions
├── infrastructure/       # External integrations
│   ├── adapters/        # Adapters for camera, storage, etc.
│   └── event-bus/       # Event bus implementation
└── presentation/         # UI layer
    ├── components/      # Reusable UI components
    ├── hooks/           # Custom React hooks
    ├── settings/        # Settings feature
    ├── workout/         # Workout feature
    └── workout-history/ # History feature
```

## License

MIT

## Contributing

Contributions are welcome!

---

**Built with:** Preact • TensorFlow.js • YOLOv8 • Vite • TypeScript
