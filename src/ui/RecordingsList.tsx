import { useEffect, useState } from "preact/hooks";
import { VideoStorage, type RecordingMetadata } from "../tracker/video-storage";
import { RepGraph } from "./RepGraph";

interface RecordingsListProps {
  videoStorage: VideoStorage;
  onBack: () => void;
}

export function RecordingsList({ videoStorage, onBack }: RecordingsListProps) {
  const [recordings, setRecordings] = useState<RecordingMetadata[]>([]);
  const [selectedRecording, setSelectedRecording] = useState<string | null>(
    null
  );
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showGraph, setShowGraph] = useState(false);

  useEffect(() => {
    loadRecordings();
  }, []);

  const loadRecordings = async () => {
    try {
      const list = await videoStorage.listRecordings();
      setRecordings(list);
      setError(null);
    } catch (err) {
      setError("Failed to load recordings. Please try again.");
    }
  };

  const handlePlay = async (id: string) => {
    try {
      if (selectedRecording === id && !showGraph) {
        if (videoUrl) {
          URL.revokeObjectURL(videoUrl);
        }
        setVideoUrl(null);
        setSelectedRecording(null);
        return;
      }

      const blob = await videoStorage.getRecording(id);
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setSelectedRecording(id);
      setShowGraph(false);
      setError(null);
    } catch (err) {
      setError("Failed to play recording. Please try again.");
    }
  };

  const handleDownload = async (id: string) => {
    try {
      const blob = await videoStorage.getRecording(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `workout_${id}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setError(null);
    } catch (err) {
      setError("Failed to download recording. Please try again.");
    }
  };

  const handleToggleGraph = (id: string) => {
    if (selectedRecording === id && showGraph) {
      setShowGraph(false);
      setSelectedRecording(null);
    } else {
      setSelectedRecording(id);
      setShowGraph(true);
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
        setVideoUrl(null);
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await videoStorage.deleteRecording(id);
      await loadRecordings();
      if (selectedRecording === id) {
        if (videoUrl) {
          URL.revokeObjectURL(videoUrl);
        }
        setVideoUrl(null);
        setSelectedRecording(null);
        setShowGraph(false);
      }
      setError(null);
    } catch (err) {
      setError("Failed to delete recording. Please try again.");
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div class="recordings-view">
      <button onClick={onBack} class="back-button">
        Back to Workout
      </button>
      {error && <div class="error-message">{error}</div>}
      {recordings.length === 0 ? (
        <div class="no-recordings">No recordings found</div>
      ) : (
        <div class="recordings-list">
          {recordings.map((recording) => (
            <div key={recording.id} class="recording-item">
              <div class="recording-date">
                {formatDate(recording.timestamp)}
              </div>
              <div class="recording-stats">
                <div>Duration: {formatDuration(recording.duration)}</div>
                <div>Reps: {recording.repCount}</div>
                <div>Avg RPM: {recording.averageRPM.toFixed(1)}</div>
              </div>
              <div class="recording-actions">
                <button onClick={() => handlePlay(recording.id)}>
                  {selectedRecording === recording.id && !showGraph
                    ? "Hide"
                    : "Play"}
                </button>
                <button onClick={() => handleToggleGraph(recording.id)}>
                  {selectedRecording === recording.id && showGraph
                    ? "Hide Graph"
                    : "View Graph"}
                </button>
                <button onClick={() => handleDownload(recording.id)}>
                  Download
                </button>
                <button onClick={() => handleDelete(recording.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {videoUrl && selectedRecording && !showGraph && (
        <div class="video-player">
          <video
            src={videoUrl}
            controls
            width="480"
            height="640"
            onEnded={() => {
              URL.revokeObjectURL(videoUrl);
              setVideoUrl(null);
            }}
          />
        </div>
      )}
      {showGraph && selectedRecording && (
        <div class="graph-container">
          <RepGraph
            repData={
              recordings.find((r) => r.id === selectedRecording)?.repHistory ||
              []
            }
          />
        </div>
      )}
    </div>
  );
}
