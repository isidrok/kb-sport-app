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
  type Tensor3D,
} from "@tensorflow/tfjs";

export interface ModelOptions {
  modelURL: string;
  onProgress?: (fraction: number) => void;
}

export class YoloV8NPoseModel {
  private model!: GraphModel;
  private inputShape!: number[];
  private options: ModelOptions;

  constructor(options: ModelOptions) {
    if (!options.modelURL) {
      throw new Error("modelURL is required");
    }
    this.options = options;
  }

  async init() {
    this.model = await loadGraphModel(this.options.modelURL, {
      onProgress: this.options.onProgress,
    });
    this.inputShape = this.model.inputs[0].shape!;
  }

  process(video: HTMLVideoElement) {
    return tidy(() => {
      const { frame, scale, dx, dy, origWidth, origHeight } =
        this.getFrame(video);
      const predictions = this.model.predict(frame) as Tensor;
      const detection = this.getBestDetection(predictions);
      return { ...detection, scale, dx, dy, origWidth, origHeight };
    });
  }

  dispose() {
    if (this.model) {
      this.model.dispose();
    }
  }

  /**
   * Returns a frame from the video and the scale/padding info.
   * YOLOv8n-pose expects input in the shape [batch_size, height, width, channels]
   * The input needs to be:
   * 1. Padded to be square if the input isn't already square
   * 2. Resized to inputSize x inputSize
   * 3. Normalized to values between 0 and 1 (divided by 255)
   * 4. Have a batch dimension added
   * @param video - The video to get a frame from.
   * @returns The tensor ready for process, and scale/padding info.
   */
  private getFrame(video: HTMLVideoElement) {
    return tidy(() => {
      const frame = tfBrowser.fromPixels(video);
      const [modelHeight, modelWidth] = this.inputShape.slice(1, 3);
      const [frameHeight, frameWidth] = frame.shape.slice(0, 2);

      // Convert to float and normalize
      const float32 = frame.toFloat();
      const normalized = float32.div<Tensor3D>(255.0);

      // Calculate padding to make the image square while preserving aspect ratio
      const maxDim = Math.max(frameWidth, frameHeight);
      const padWidth = maxDim - frameWidth;
      const padHeight = maxDim - frameHeight;
      const dx = Math.floor(padWidth / 2);
      const dy = Math.floor(padHeight / 2);

      // Pad the image to make it square
      const padded = normalized.pad<Tensor3D>([
        [dy, padHeight - dy],
        [dx, padWidth - dx],
        [0, 0],
      ]);

      // Now resize the square padded image to model dimensions
      const resized = image.resizeBilinear(padded, [modelHeight, modelWidth]);

      // Add batch dimension
      const batched = resized.expandDims(0);

      // Calculate the scale factor for coordinate transformation
      const scale = maxDim / modelWidth;

      return {
        frame: batched,
        scale,
        dx,
        dy,
        origWidth: frameWidth,
        origHeight: frameHeight,
      };
    });
  }
  private getBestDetection(predictions: Tensor) {
    return tidy(() => {
      // Step 1: Transpose predictions to match expected format
      // Original shape: [1, 56, 8400] -> [1, 8400, 56]
      const transpose = predictions.transpose([0, 2, 1]);

      // Step 2: Extract box coordinates and convert to [x1, y1, x2, y2] format
      const w = slice(transpose, [0, 0, 2], [-1, -1, 1]); // width
      const h = slice(transpose, [0, 0, 3], [-1, -1, 1]); // height
      const x1 = sub(slice(transpose, [0, 0, 0], [-1, -1, 1]), div(w, 2)); // x1 = x - w/2
      const y1 = sub(slice(transpose, [0, 0, 1], [-1, -1, 1]), div(h, 2)); // y1 = y - h/2
      const x2 = add(x1, w); // x2 = x1 + width
      const y2 = add(y1, h); // y2 = y1 + height

      // Step 3: Extract confidence scores
      const scores = slice(transpose, [0, 0, 4], [-1, -1, 1]);

      // Step 4: Extract keypoints
      const keypoints = slice(transpose, [0, 0, 5], [-1, -1, -1]);

      // Step 5: Get the best detection
      const scoresData = scores.dataSync();
      const maxScoreIndex = scoresData.indexOf(Math.max(...scoresData));

      // Step 6: Get the box, score, and keypoints for the best detection
      const bestBox = squeeze(
        concat(
          [
            slice(x1, [0, maxScoreIndex, 0], [1, 1, 1]),
            slice(y1, [0, maxScoreIndex, 0], [1, 1, 1]),
            slice(x2, [0, maxScoreIndex, 0], [1, 1, 1]),
            slice(y2, [0, maxScoreIndex, 0], [1, 1, 1]),
          ],
          2
        )
      );

      const bestScore = squeeze(
        slice(scores, [0, maxScoreIndex, 0], [1, 1, 1])
      );
      const bestKeypoints = squeeze(
        slice(keypoints, [0, maxScoreIndex, 0], [1, 1, -1])
      );

      return {
        box: bestBox,
        score: bestScore,
        keypoints: bestKeypoints,
      };
    });
  }
}
