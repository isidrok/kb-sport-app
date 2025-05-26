import { useState } from "preact/hooks";
import { WorkoutView } from "./ui/WorkoutView";
import { RecordingsList } from "./ui/RecordingsList";
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
        <RecordingsList
          videoStorage={videoStorage}
          onBack={() => setCurrentView("workout")}
        />
      )}
    </div>
  );
}
