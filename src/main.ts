import { YoloV8NPoseModel } from "./model";
import { Whiteboard } from "./whiteboard";
import { VideoHandler } from "./video";

const model = new YoloV8NPoseModel();

// Get DOM elements
const go = document.getElementById("go") as HTMLButtonElement;
const video = document.getElementById("video") as HTMLVideoElement;
const canvas = document.getElementById("canvas") as HTMLCanvasElement;

// Initialize handlers
const whiteboard = new Whiteboard(canvas);
const videoHandler = new VideoHandler(video);

let capturing = false;

async function startProcessing() {
  try {
    const { box, score, keypoints } = model.process(videoHandler.getVideo());
    const keypointsData = await keypoints.data();
    whiteboard.drawFrame(videoHandler.getVideo(), keypointsData);
    box.dispose();
    score.dispose();
    keypoints.dispose();
  } catch (error) {
    console.error("Error in startProcessing:", error);
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
      });
    }
  }

  // Continue processing if still capturing
  if (capturing) {
    requestAnimationFrame(startProcessing);
  }
}

async function startCapturing() {
  await videoHandler.start();
  startProcessing();
  go.textContent = "Stop";
  capturing = true;
}

async function stopCapturing() {
  videoHandler.stop();
  setTimeout(() => {
    whiteboard.clear();
  }, 100);

  go.textContent = "Start";
  capturing = false;
}

async function main() {
  await model.init("models/yolov8n-pose_web_model/model.json");
  go.addEventListener("click", () => {
    if (capturing) {
      stopCapturing();
    } else {
      startCapturing();
    }
  });
}
main();
