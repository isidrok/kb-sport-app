import { PoseTracker } from "./pose-tracker";

async function main() {
  // Get DOM elements
  const go = document.getElementById("go") as HTMLButtonElement;
  const video = document.getElementById("video") as HTMLVideoElement;
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;

  let tracker: PoseTracker | null = null;
  let isRunning = false;

  // Create and initialize a new tracker
  async function createTracker() {
    if (tracker) {
      tracker.dispose();
    }

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
    });

    await tracker.init();
  }

  // Initial setup
  await createTracker();

  // Handle button clicks
  go.addEventListener("click", async () => {
    if (go.textContent === "Start") {
      await tracker!.start();
      isRunning = true;
      go.textContent = "Stop";
    } else {
      tracker!.stop();
      isRunning = false;
      go.textContent = "Start";
    }
  });
}

main();
