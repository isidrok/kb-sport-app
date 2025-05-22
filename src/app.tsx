import { useState } from "preact/hooks";
import { WorkoutView } from "./components/WorkoutView";
import { RecordingsList } from "./components/RecordingsList";
import { VideoStorage } from "./tracker/video-storage";

export function App() {
  const [videoStorage] = useState(() => new VideoStorage());
  const [currentView, setCurrentView] = useState<"workout" | "recordings">(
    "workout"
  );

  return (
    <div class="app">
      {currentView === "workout" ? (
        <WorkoutView
          onViewChange={() => setCurrentView("recordings")}
          videoStorage={videoStorage}
        />
      ) : (
        <div class="recordings-view">
          <button onClick={() => setCurrentView("workout")} class="view-switch">
            Back to Workout
          </button>
          <RecordingsList videoStorage={videoStorage} />
        </div>
      )}
    </div>
  );
}
