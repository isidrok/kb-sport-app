import { Prediction } from "@/domain/types/rep-detection.types";
import {
  loadGraphModel,
  browser as tfBrowser,
  slice,
  sub,
  div,
  add,
  squeeze,
  concat,
  tidy,
  zeros,
  type Tensor3D,
  GraphModel,
} from "@tensorflow/tfjs";

export interface PredictionTransformParams {
  scale: number;
  xOffset: number;
  yOffset: number;
  originalWidth: number;
  originalHeight: number;
}

export interface PredictionResult {
  bestPrediction: Prediction;
  transformParams: PredictionTransformParams;
}

export class PredictionAdapter {
  private model: GraphModel | null = null;

  async initialize(): Promise<void> {
    const modelURL =
      import.meta.env.BASE_URL + "models/yolov8n-pose_web_model/model.json";
    this.model = await loadGraphModel(modelURL);

    await this.warmUp();
  }

  process(video: HTMLVideoElement): PredictionResult | null {
    if (!this.model) {
      throw new Error("Model not initialized. Call initialize() first.");
    }

    if (!video.srcObject) {
      console.warn(
        "PredictionAdapter: Video element has no valid stream, skipping processing",
      );
      return null;
    }

    let result: PredictionResult;

    tidy(() => {
      const { processedImage, transformParams } =
        this.processVideoWithLetterboxing(video, this.model!);
      const predictions = this.model!.predict(processedImage) as Tensor3D;
      const bestPrediction = this.getBestPredictionSync(predictions);
      const scaledPrediction = this.scalePrediction(
        bestPrediction,
        transformParams,
      );

      result = {
        bestPrediction: scaledPrediction,
        transformParams,
      };
    });

    return result!;
  }

  isInitialized(): boolean {
    return this.model !== null;
  }

  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
  }

  private async warmUp(): Promise<void> {
    if (!this.model) {
      throw new Error("Model not initialized");
    }

    const modelInputShape = this.model.inputs[0].shape!;
    const [, height, width, channels] = modelInputShape; // Skip batch size

    const dummyInput = zeros([height, width, channels]) as Tensor3D;
    const batchedInput = dummyInput.expandDims(0) as Tensor3D;

    try {
      const result = this.model.predict(batchedInput) as Tensor3D;
      result.dispose();
    } finally {
      batchedInput.dispose();
      dummyInput.dispose();
    }
  }

  /**
   * Extract the best prediction from YOLOv8 pose model output (synchronous version).
   * Processes the raw model output tensor to find the prediction with highest confidence,
   * converts bounding box from center format to corner format, and formats keypoints.
   *
   * @param predictions - Raw model output tensor with shape [1, 56, 8400]
   *                     56 channels: [x, y, w, h, conf, kpt1_x, kpt1_y, kpt1_c, ..., kpt17_x, kpt17_y, kpt17_c]
   *                     8400 predictions: different potential detections across the image
   * @returns The best prediction with bounding box, score, and keypoints
   */
  private getBestPredictionSync(predictions: Tensor3D): Prediction {
    // Reshape predictions from [1, 56, 8400] to [1, 8400, 56] for easier processing
    // Each of the 8400 predictions now has 56 values: [x, y, w, h, conf, kpt1_x, kpt1_y, kpt1_c, ...]
    const reshapedPredictions = predictions.transpose([0, 2, 1]);

    // Extract bounding box components (center format: x, y, width, height)
    const centerX = slice(reshapedPredictions, [0, 0, 0], [-1, -1, 1]);
    const centerY = slice(reshapedPredictions, [0, 0, 1], [-1, -1, 1]);
    const width = slice(reshapedPredictions, [0, 0, 2], [-1, -1, 1]);
    const height = slice(reshapedPredictions, [0, 0, 3], [-1, -1, 1]);

    // Convert from center format to corner format (x1, y1, x2, y2)
    const halfWidth = div(width, 2);
    const halfHeight = div(height, 2);
    const x1 = sub(centerX, halfWidth);
    const y1 = sub(centerY, halfHeight);
    const x2 = add(centerX, halfWidth);
    const y2 = add(centerY, halfHeight);

    // Extract confidence scores and keypoints
    const confidenceScores = slice(reshapedPredictions, [0, 0, 4], [-1, -1, 1]);
    const allKeypoints = slice(reshapedPredictions, [0, 0, 5], [-1, -1, -1]); // All remaining 51 values (17 keypts × 3)

    // Find the prediction with highest confidence
    const scoresArray = confidenceScores.dataSync();
    const bestPredictionIndex = scoresArray.indexOf(Math.max(...scoresArray));
    const bestConfidence = scoresArray[bestPredictionIndex];

    // Extract the best bounding box [x1, y1, x2, y2]
    const x1Slice = slice(x1, [0, bestPredictionIndex, 0], [1, 1, 1]);
    const y1Slice = slice(y1, [0, bestPredictionIndex, 0], [1, 1, 1]);
    const x2Slice = slice(x2, [0, bestPredictionIndex, 0], [1, 1, 1]);
    const y2Slice = slice(y2, [0, bestPredictionIndex, 0], [1, 1, 1]);
    const concatResult = concat([x1Slice, y1Slice, x2Slice, y2Slice], 2);
    const bestBoundingBox = squeeze(concatResult);

    // Extract the best keypoints (51 values: 17 keypoints × 3 values each)
    const keypointsSlice = slice(
      allKeypoints,
      [0, bestPredictionIndex, 0],
      [1, 1, -1],
    );
    const bestKeypointsTensor = squeeze(keypointsSlice);

    // Convert keypoints tensor to array and group into [x, y, confidence] triplets
    const keypointsData = [...bestKeypointsTensor.dataSync()];
    const formattedKeypoints: [number, number, number][] = [];

    for (let i = 0; i < keypointsData.length; i += 3) {
      const x = keypointsData[i];
      const y = keypointsData[i + 1];
      const confidence = keypointsData[i + 2];
      formattedKeypoints.push([x, y, confidence]);
    }

    const boxData = [...bestBoundingBox.dataSync()] as [
      number,
      number,
      number,
      number,
    ];

    return {
      box: boxData,
      score: bestConfidence,
      keypoints: formattedKeypoints,
    };
  }

  /**
   * Apply letterboxing to maintain aspect ratio when resizing for model input.
   * Letterboxing adds padding (black bars) to make the image square before resizing.
   * This prevents distortion that would occur with direct resizing of non-square images.
   *
   * @param video - Source video element to process
   * @param model - TensorFlow.js model to get input shape requirements
   * @returns Object containing the processed image tensor and transformation parameters
   *          needed to map predictions back to original image coordinates
   */
  private processVideoWithLetterboxing(
    video: HTMLVideoElement,
    model: GraphModel,
  ): {
    processedImage: Tensor3D;
    transformParams: PredictionTransformParams;
  } {
    // Get model's expected input dimensions
    const modelInputShape = model.inputs[0].shape!;
    const [modelHeight, modelWidth] = modelInputShape.slice(1, 3);

    // Convert video to tensor and normalize to [0, 1]
    const originalImageTensor = tfBrowser.fromPixels(video).toFloat().div(255);

    // Step 1: Calculate letterboxing parameters
    // Find the larger dimension to determine the target square size
    const originalWidth = video.videoWidth;
    const originalHeight = video.videoHeight;
    const targetSquareSize = Math.max(originalWidth, originalHeight);

    // Calculate how much padding is needed on each axis
    const totalWidthPadding = targetSquareSize - originalWidth;
    const totalHeightPadding = targetSquareSize - originalHeight;

    // Distribute padding equally on both sides (center the image)
    const leftPadding = Math.floor(totalWidthPadding / 2);
    const rightPadding = totalWidthPadding - leftPadding;
    const topPadding = Math.floor(totalHeightPadding / 2);
    const bottomPadding = totalHeightPadding - topPadding;

    // Step 2: Apply letterboxing by adding padding (creates black bars)
    const letterboxedImage = originalImageTensor.pad<Tensor3D>([
      [topPadding, bottomPadding], // Height padding
      [leftPadding, rightPadding], // Width padding
      [0, 0], // No channel padding
    ]);

    // Step 3: Resize the square image to model input size
    const resizedImage = letterboxedImage.resizeBilinear<Tensor3D>([
      modelHeight,
      modelWidth,
    ]);

    // Step 4: Add batch dimension for model input [1, height, width, channels]
    const batchedImage = resizedImage.expandDims(0);

    // Calculate transformation parameters for mapping predictions back to original coordinates
    const scale = targetSquareSize / modelWidth; // Scale factor to map from model space back to letterboxed space
    const xOffset = leftPadding; // X displacement caused by letterboxing
    const yOffset = topPadding; // Y displacement caused by letterboxing

    return {
      processedImage: batchedImage as Tensor3D,
      transformParams: {
        scale,
        xOffset,
        yOffset,
        originalWidth,
        originalHeight,
      },
    };
  }

  /**
   * Scale prediction coordinates from model space back to original image space.
   * This accounts for both the letterboxing padding and the resize operation.
   */
  private scalePrediction(
    prediction: Prediction,
    transformParams: PredictionTransformParams,
  ): Prediction {
    const { scale, xOffset, yOffset } = transformParams;

    // Transform bounding box coordinates
    const [modelX1, modelY1, modelX2, modelY2] = prediction.box;
    const scaledBox: [number, number, number, number] = [
      this.transformCoordinate(modelX1, scale, xOffset),
      this.transformCoordinate(modelY1, scale, yOffset),
      this.transformCoordinate(modelX2, scale, xOffset),
      this.transformCoordinate(modelY2, scale, yOffset),
    ];

    // Transform keypoint coordinates
    const scaledKeypoints: [number, number, number][] =
      prediction.keypoints.map(
        ([x, y, confidence]: [number, number, number]) => [
          this.transformCoordinate(x, scale, xOffset),
          this.transformCoordinate(y, scale, yOffset),
          confidence, // Confidence stays the same
        ],
      );

    return {
      box: scaledBox,
      score: prediction.score,
      keypoints: scaledKeypoints,
    };
  }

  /**
   * Transform a single coordinate from model space back to original image space.
   */
  private transformCoordinate(
    coord: number,
    scale: number,
    offset: number,
  ): number {
    return coord * scale - offset;
  }
}

// Export singleton instance
export const predictionAdapter = new PredictionAdapter();
