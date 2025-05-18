import { PoseTracker } from "./pose-tracker";

async function main() {
  // Get DOM elements
  const go = document.getElementById("go") as HTMLButtonElement;
  const video = document.getElementById("video") as HTMLVideoElement;
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;

  // Create and initialize pose tracker
  const tracker = new PoseTracker({
    width: canvas.width,
    height: canvas.height,
    videoElement: video,
    canvasElement: canvas,
    model: {
      modelURL: "models/yolov8n-pose_web_model/model.json",
      onProgress: (fraction) => {
        console.log(`Loading model: ${Math.round(fraction * 100)}%`);
      },
    },
  });

  await tracker.init();

  // Handle button clicks
  go.addEventListener("click", async () => {
    if (go.textContent === "Start") {
      await tracker.start();
      go.textContent = "Stop";
    } else {
      tracker.stop();
      go.textContent = "Start";
    }
  });
}

main();
