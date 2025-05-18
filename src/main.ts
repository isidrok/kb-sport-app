import {
  GraphModel,
  loadGraphModel,
  browser as tfBrowser,
  tidy,
  image,
  Tensor,
  concat,
  sub,
  div,
  add,
  slice,
  squeeze,
} from "@tensorflow/tfjs";
import type { Tensor3D } from "@tensorflow/tfjs";

// Canvas and video configuration
const CANVAS_SIZE = 640;
const CONFIDENCE_THRESHOLD = 0.3;
const KEYPOINT_RADIUS = 5;
const KEYPOINT_LABEL_OFFSET = 10;
const KEYPOINT_LABEL_FONT = "12px Arial";
const SKELETON_LINE_WIDTH = 2;

// Colors for visualization
const COLORS = {
  KEYPOINT: "red",
  KEYPOINT_LABEL: "white",
  SKELETON: "blue",
} as const;

// Get DOM elements
const go = document.getElementById("go") as HTMLButtonElement;
const video = document.getElementById("video") as HTMLVideoElement;
const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d");

if (!ctx) {
  throw new Error("Could not get canvas context");
}

// Assert ctx is non-null after the check
const context = ctx as CanvasRenderingContext2D;

// Set canvas size to match video
canvas.width = CANVAS_SIZE;
canvas.height = CANVAS_SIZE;

/**
 * Maps keypoint names to their corresponding indices in the YOLOv8 pose detection output.
 * YOLOv8 uses the COCO keypoint format with 17 keypoints.
 */
const keypointNames = {
  nose: 0,
  left_eye: 1,
  right_eye: 2,
  left_ear: 3,
  right_ear: 4,
  left_shoulder: 5,
  right_shoulder: 6,
  left_elbow: 7,
  right_elbow: 8,
  left_wrist: 9,
  right_wrist: 10,
  left_hip: 11,
  right_hip: 12,
  left_knee: 13,
  right_knee: 14,
  left_ankle: 15,
  right_ankle: 16,
} as const;

/**
 * Defines the connections between keypoints to draw the skeleton.
 * Each pair represents a line to be drawn between two keypoints.
 * The connections follow the COCO keypoint format.
 */
const keypointConnections = [
  // Arms
  [keypointNames.left_shoulder, keypointNames.left_elbow],
  [keypointNames.left_elbow, keypointNames.left_wrist],
  [keypointNames.right_shoulder, keypointNames.right_elbow],
  [keypointNames.right_elbow, keypointNames.right_wrist],
  // Shoulders
  [keypointNames.left_shoulder, keypointNames.right_shoulder],
  // Legs
  [keypointNames.left_hip, keypointNames.left_knee],
  [keypointNames.left_knee, keypointNames.left_ankle],
  [keypointNames.right_hip, keypointNames.right_knee],
  [keypointNames.right_knee, keypointNames.right_ankle],
  // Hips
  [keypointNames.left_hip, keypointNames.right_hip],
  // Torso
  [keypointNames.left_shoulder, keypointNames.left_hip],
  [keypointNames.right_shoulder, keypointNames.right_hip],
  // Face
  [keypointNames.nose, keypointNames.left_eye],
  [keypointNames.left_eye, keypointNames.left_ear],
  [keypointNames.nose, keypointNames.right_eye],
  [keypointNames.right_eye, keypointNames.right_ear],
] as const;

let capturing = false;
let model: GraphModel;

/**
 * Loads the YOLOv8 pose detection model.
 * The model is loaded only once and cached for subsequent uses.
 */
async function getModel() {
  if (!model) {
    const modelURL = "models/yolo11n-pose_web_model/model.json";
    console.log("Loading model from:", modelURL);
    model = await loadGraphModel(modelURL, {
      onProgress: (fraction) => {
        console.log(`Loading model`, fraction);
      },
    });
    const inputShape = model.inputs[0].shape;
    console.log("Model input shape:", inputShape);
  }
  return model;
}

/**
 * Draws keypoints and skeleton on the canvas.
 * @param keypoints Array of [x, y, confidence] values for each keypoint
 */
function drawKeypoints(keypoints: number[][]) {
  // Draw keypoints
  keypoints.forEach((keypoint, i) => {
    const [x, y, confidence] = keypoint;
    if (confidence > CONFIDENCE_THRESHOLD) {
      // Draw keypoint circle
      context.beginPath();
      context.arc(x, y, KEYPOINT_RADIUS, 0, 2 * Math.PI);
      context.fillStyle = COLORS.KEYPOINT;
      context.fill();

      // Draw keypoint label
      context.fillStyle = COLORS.KEYPOINT_LABEL;
      context.font = KEYPOINT_LABEL_FONT;
      const name = Object.keys(keypointNames).find(
        (key) => keypointNames[key as keyof typeof keypointNames] === i
      );
      if (name) {
        context.fillText(name, x + KEYPOINT_LABEL_OFFSET, y);
      }
    }
  });

  // Draw skeleton connections
  context.strokeStyle = COLORS.SKELETON;
  context.lineWidth = SKELETON_LINE_WIDTH;
  keypointConnections.forEach(([i, j]) => {
    const kp1 = keypoints[i];
    const kp2 = keypoints[j];
    if (kp1[2] > CONFIDENCE_THRESHOLD && kp2[2] > CONFIDENCE_THRESHOLD) {
      context.beginPath();
      context.moveTo(kp1[0], kp1[1]);
      context.lineTo(kp2[0], kp2[1]);
      context.stroke();
    }
  });
}

async function startProcessing() {
  let input: Tensor | null = null;
  try {
    console.log("Starting processing...");
    const model = await getModel();
    console.log("Model loaded successfully");

    input = tidy(() => {
      console.log("Creating input tensor...");
      const img = tfBrowser.fromPixels(video);
      console.log("Original image shape:", img.shape);

      const [h, w] = img.shape.slice(0, 2);
      const maxSize = Math.max(w, h);

      // Pad the image to make it square
      const imgPadded = img.pad<Tensor3D>([
        [0, maxSize - h],
        [0, maxSize - w],
        [0, 0],
      ]);
      console.log("Padded image shape:", imgPadded.shape);

      // Convert to float32 and normalize to [0,1]
      const float32 = imgPadded.toFloat();
      const normalized = float32.div(255.0) as Tensor3D;
      console.log("Normalized shape:", normalized.shape);

      // Ensure correct shape and format
      const resized = image.resizeBilinear(normalized, [
        CANVAS_SIZE,
        CANVAS_SIZE,
      ]) as Tensor3D;
      console.log("Resized shape:", resized.shape);

      // Add batch dimension
      const batched = resized.expandDims(0);
      console.log("Final batched shape:", batched.shape);

      return batched;
    });

    console.log("Running prediction...");
    const predictions = model.predict(input) as Tensor;
    console.log("Got predictions, shape:", predictions.shape);

    // Process predictions similar to the sample code
    const transpose = predictions.transpose([0, 2, 1]);
    console.log("Transposed shape:", transpose.shape);

    // Extract boxes and scores first
    const boxes = tidy(() => {
      const w = slice(transpose, [0, 0, 2], [-1, -1, 1]);
      const h = slice(transpose, [0, 0, 3], [-1, -1, 1]);
      const x1 = sub(slice(transpose, [0, 0, 0], [-1, -1, 1]), div(w, 2));
      const y1 = sub(slice(transpose, [0, 0, 1], [-1, -1, 1]), div(h, 2));
      return squeeze(concat([y1, x1, add(y1, h), add(x1, w)], 2));
    });

    const scores = tidy(() => {
      return squeeze(slice(transpose, [0, 0, 4], [-1, -1, 1]));
    });

    // Extract landmarks
    const landmarks = tidy(() => {
      return squeeze(slice(transpose, [0, 0, 5], [-1, -1, -1]));
    });

    // Get the best detection
    const scoresData = await scores.data();
    const maxScoreIndex = scoresData.indexOf(Math.max(...scoresData));
    console.log(
      "Best detection index:",
      maxScoreIndex,
      "score:",
      scoresData[maxScoreIndex]
    );

    // Get landmarks for the best detection
    const landmarksData = await landmarks.data();
    const startIndex = maxScoreIndex * 51; // 17 keypoints * 3 values per keypoint

    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Draw flipped video
    context.save();
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    context.restore();

    // Process and draw keypoints
    const keypoints = [];

    // Process 17 keypoints (3 values per keypoint: x, y, confidence)
    for (let i = 0; i < 17; i++) {
      // Flip x coordinate for keypoints to match flipped video
      const x = canvas.width - landmarksData[startIndex + i * 3];
      const y = landmarksData[startIndex + i * 3 + 1];
      const conf = landmarksData[startIndex + i * 3 + 2];

      console.log(`Keypoint ${i}:`, {
        rawX: landmarksData[startIndex + i * 3],
        rawY: landmarksData[startIndex + i * 3 + 1],
        x,
        y,
        confidence: conf,
      });

      keypoints.push([x, y, conf]);
    }

    console.log("Drawing keypoints...");
    drawKeypoints(keypoints);

    // Clean up tensors
    predictions.dispose();
    transpose.dispose();
    boxes.dispose();
    scores.dispose();
    landmarks.dispose();
  } catch (error) {
    console.error("Error in startProcessing:", error);
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
      });
    }
    // Clean up input tensor in case of error
    if (input) {
      input.dispose();
    }
  }

  // Continue processing if still capturing
  if (capturing) {
    // requestAnimationFrame(startProcessing);
  }
}

async function startCapturing() {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { width: CANVAS_SIZE, height: CANVAS_SIZE, facingMode: "user" },
  });
  video.srcObject = stream;
  video.addEventListener("loadeddata", startProcessing, { once: true });
  go.textContent = "Stop";
  capturing = true;
}

async function stopCapturing() {
  const stream = video.srcObject;
  if (stream instanceof MediaStream) {
    stream.getTracks().forEach((track) => track.stop());
  }
  setTimeout(() => {
    context.clearRect(0, 0, canvas.width, canvas.height);
  }, 1000);

  go.textContent = "Start";
  capturing = false;
}

async function main() {
  go.addEventListener("click", () => {
    if (capturing) {
      stopCapturing();
    } else {
      startCapturing();
    }
  });
}
main();
