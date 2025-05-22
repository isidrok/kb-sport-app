import { PoseTracker } from "./pose-tracker";
import { RepTracker } from "./rep-tracker";

async function main() {
  // Get DOM elements
  const go = document.getElementById("go") as HTMLButtonElement;
  const video = document.getElementById("video") as HTMLVideoElement;
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  const counter = document.getElementById("counter") as HTMLDivElement;

  let tracker: PoseTracker | null = null;
  let repTracker: RepTracker | null = null;

  function updateDisplay(stats: { totalReps: number; rpm: number }) {
    counter.textContent = `Repetitions: ${stats.totalReps} (${stats.rpm} RPM)`;
  }

  // Create and initialize a new tracker
  async function createTracker() {
    if (tracker) {
      tracker.dispose();
    }

    repTracker = new RepTracker();

    tracker = new PoseTracker({
      width: 480,
      height: 640,
      videoElement: video,
      canvasElement: canvas,
      model: {
        modelURL: "models/yolov8n-pose_web_model/model.json",
        onProgress: (fraction) => {
          console.log(`Loading model: ${Math.round(fraction * 100)}%`);
        },
      },
      flipVideo: true,
      onPose: (keypoints) => {
        const stats = repTracker?.detect(keypoints);
        if (stats) {
          updateDisplay(stats);
        }
      },
    });

    await tracker.init();
  }

  // Initial setup
  await createTracker();

  // Handle button clicks
  go.addEventListener("click", async () => {
    if (go.textContent === "Start") {
      try {
        await tracker!.start();
        go.textContent = "Stop";
      } catch (error) {
        console.error("Error starting tracker:", error);
        alert("Failed to start tracking");
      }
    } else {
      try {
        tracker!.stop();
        go.textContent = "Start";
        repTracker?.reset();
        updateDisplay({ totalReps: 0, rpm: 0 });
      } catch (error) {
        console.error("Error stopping tracker:", error);
        alert("Failed to stop tracking");
      }
    }
  });
}

main();
