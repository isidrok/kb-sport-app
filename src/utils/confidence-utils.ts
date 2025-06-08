import type { Keypoint } from "../service/prediction.service";

/**
 * Check if a keypoint meets the minimum confidence threshold
 *
 * @param keypoint - Keypoint with coordinates and confidence [x, y, confidence]
 * @param threshold - Minimum confidence threshold
 * @returns True if keypoint confidence is above threshold
 */
export function isKeypointVisible(keypoint: Keypoint, threshold: number): boolean {
  return keypoint[2] >= threshold;
}

/**
 * Check if multiple keypoints all meet the minimum confidence threshold
 *
 * @param keypoints - Array of keypoints to check
 * @param threshold - Minimum confidence threshold
 * @returns True if all keypoints have confidence above threshold
 */
export function areKeypointsVisible(keypoints: Keypoint[], threshold: number): boolean {
  return keypoints.every(keypoint => isKeypointVisible(keypoint, threshold));
}

/**
 * Filter keypoints that meet the minimum confidence threshold
 *
 * @param keypoints - Array of keypoints to filter
 * @param threshold - Minimum confidence threshold
 * @returns Array of keypoints with confidence above threshold
 */
export function filterVisibleKeypoints(keypoints: Keypoint[], threshold: number): Keypoint[] {
  return keypoints.filter(keypoint => isKeypointVisible(keypoint, threshold));
}