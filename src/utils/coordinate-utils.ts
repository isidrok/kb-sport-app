import type { Prediction, BoundingBox, Keypoint, TransformParams } from "../service/prediction.service";

/**
 * Scale prediction coordinates from model space back to original image space.
 * This accounts for both the letterboxing padding and the resize operation.
 *
 * @param prediction - Raw prediction from the model with coordinates in model space
 * @param transformParams - Transformation parameters including scale and offsets
 * @returns Prediction with coordinates transformed to original image space
 */
export function scalePrediction(
  prediction: Prediction,
  transformParams: TransformParams
): Prediction {
  const { scale, xOffset, yOffset } = transformParams;

  // Transform bounding box coordinates
  const [modelX1, modelY1, modelX2, modelY2] = prediction.box;
  const scaledBox: BoundingBox = [
    transformCoordinate(modelX1, scale, xOffset),
    transformCoordinate(modelY1, scale, yOffset),
    transformCoordinate(modelX2, scale, xOffset),
    transformCoordinate(modelY2, scale, yOffset),
  ];

  // Transform keypoint coordinates
  const scaledKeypoints: Keypoint[] = prediction.keypoints.map(
    ([x, y, confidence]) => [
      transformCoordinate(x, scale, xOffset),
      transformCoordinate(y, scale, yOffset),
      confidence, // Confidence stays the same
    ]
  );

  return {
    box: scaledBox,
    score: prediction.score,
    keypoints: scaledKeypoints,
  };
}

/**
 * Transform a single coordinate from model space back to original image space.
 *
 * @param coord - Coordinate value in model space
 * @param scale - Scale factor to convert from model space to letterboxed space
 * @param offset - Offset to subtract after scaling to account for letterboxing padding
 * @returns Transformed coordinate in original image space
 */
export function transformCoordinate(
  coord: number,
  scale: number,
  offset: number
): number {
  return coord * scale - offset;
}