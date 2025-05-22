import { useEffect, useState } from "preact/hooks";
import { VideoStorage, type RecordingMetadata } from "../tracker/video-storage";
import { RepGraph } from "./RepGraph";

interface RecordingsListProps {
  videoStorage: VideoStorage;
}

export function RecordingsList({ videoStorage }: RecordingsListProps) {
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

  const handleDelete = async (id: string) => {
    try {
      await videoStorage.deleteRecording(id);
      if (selectedRecording === id) {
        setSelectedRecording(null);
        setVideoUrl(null);
        setShowGraph(false);
      }
      await loadRecordings();
      setError(null);
    } catch (err) {
      setError("Failed to delete recording. Please try again.");
    }
  };

  const handleToggleGraph = (id: string) => {
    if (selectedRecording === id && showGraph) {
      setShowGraph(false);
    } else {
      setSelectedRecording(id);
      setShowGraph(true);
      setVideoUrl(null);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  return (
    <div class="recordings-list">
      <h2>Recorded Sessions</h2>
      {error && <div class="error-message">{error}</div>}
      {recordings.length === 0 ? (
        <div class="no-recordings">No recordings found</div>
      ) : (
        <div class="recordings-grid">
          {recordings.map((recording) => (
            <div
              key={recording.id}
              class={`recording-card ${
                selectedRecording === recording.id ? "selected" : ""
              }`}
            >
              <div class="recording-info">
                <div class="recording-date">
                  {formatDate(recording.timestamp)}
                </div>
                <div class="recording-stats">
                  <div>Duration: {formatDuration(recording.duration)}</div>
                  <div>Reps: {recording.repCount}</div>
                  <div>Avg RPM: {recording.averageRPM.toFixed(1)}</div>
                </div>
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
