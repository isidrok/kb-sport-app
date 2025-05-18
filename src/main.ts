import { PoseTracker } from "./pose-tracker";
import { keypointNames } from "./keypoints";

async function main() {
  // Get DOM elements
  const go = document.getElementById("go") as HTMLButtonElement;
  const video = document.getElementById("video") as HTMLVideoElement;
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  const counter = document.getElementById("counter") as HTMLDivElement;

  let tracker: PoseTracker | null = null;
  let isRunning = false;
  let wasRightArmAbove = false;
  let wasLeftArmAbove = false;
  let repetitions = 0;
  const CONFIDENCE_THRESHOLD = 0.5;
  const DEBOUNCE_TIME = 200; // milliseconds

  // Debounce state
  let rightArmState = {
    current: false,
    lastChange: 0,
    pending: false,
  };
  let leftArmState = {
    current: false,
    lastChange: 0,
    pending: false,
  };

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
      onPose: (keypoints) => {
        const nose = keypoints[keypointNames.nose];
        const rightElbow = keypoints[keypointNames.right_elbow];
        const leftElbow = keypoints[keypointNames.left_elbow];
        const rightWrist = keypoints[keypointNames.right_wrist];
        const leftWrist = keypoints[keypointNames.left_wrist];

        // Check if keypoints are detected with sufficient confidence
        const isNoseDetected = nose[2] > CONFIDENCE_THRESHOLD;
        const isRightElbowDetected = rightElbow[2] > CONFIDENCE_THRESHOLD;
        const isLeftElbowDetected = leftElbow[2] > CONFIDENCE_THRESHOLD;
        const isRightWristDetected = rightWrist[2] > CONFIDENCE_THRESHOLD;
        const isLeftWristDetected = leftWrist[2] > CONFIDENCE_THRESHOLD;

        // Check if any part of right arm is above head
        const rightArmAbove =
          isNoseDetected &&
          ((isRightElbowDetected && rightElbow[1] < nose[1]) ||
            (isRightWristDetected && rightWrist[1] < nose[1]));

        // Check if any part of left arm is above head
        const leftArmAbove =
          isNoseDetected &&
          ((isLeftElbowDetected && leftElbow[1] < nose[1]) ||
            (isLeftWristDetected && leftWrist[1] < nose[1]));

        const now = Date.now();

        // Handle right arm state changes
        if (isNoseDetected && (isRightElbowDetected || isRightWristDetected)) {
          if (rightArmAbove !== rightArmState.current) {
            if (!rightArmState.pending) {
              rightArmState.pending = true;
              rightArmState.lastChange = now;
            } else if (now - rightArmState.lastChange >= DEBOUNCE_TIME) {
              if (rightArmAbove && !wasRightArmAbove && !leftArmAbove) {
                repetitions++;
                counter.textContent = `Repetitions: ${repetitions}`;
              }
              wasRightArmAbove = rightArmAbove;
              rightArmState.current = rightArmAbove;
              rightArmState.pending = false;
            }
          } else {
            rightArmState.pending = false;
          }
        }

        // Handle left arm state changes
        if (isNoseDetected && (isLeftElbowDetected || isLeftWristDetected)) {
          if (leftArmAbove !== leftArmState.current) {
            if (!leftArmState.pending) {
              leftArmState.pending = true;
              leftArmState.lastChange = now;
            } else if (now - leftArmState.lastChange >= DEBOUNCE_TIME) {
              if (leftArmAbove && !wasLeftArmAbove && !rightArmAbove) {
                repetitions++;
                counter.textContent = `Repetitions: ${repetitions}`;
              }
              wasLeftArmAbove = leftArmAbove;
              leftArmState.current = leftArmAbove;
              leftArmState.pending = false;
            }
          } else {
            leftArmState.pending = false;
          }
        }

        // Handle both arms raised together
        if (
          rightArmAbove &&
          leftArmAbove &&
          !wasRightArmAbove &&
          !wasLeftArmAbove
        ) {
          repetitions++;
          counter.textContent = `Repetitions: ${repetitions}`;
          wasRightArmAbove = true;
          wasLeftArmAbove = true;
          rightArmState.current = true;
          leftArmState.current = true;
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
