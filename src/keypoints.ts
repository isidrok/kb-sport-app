/**
 * Maps keypoint names to their corresponding indices in the YOLOv8 pose detection output.
 * YOLOv8 uses the COCO keypoint format with 17 keypoints.
 */
export const keypoints = {
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

export const keypointConnections = [
  [keypoints.left_shoulder, keypoints.left_elbow],
  [keypoints.left_elbow, keypoints.left_wrist],
  [keypoints.right_shoulder, keypoints.right_elbow],
  [keypoints.right_elbow, keypoints.right_wrist],
  [keypoints.left_shoulder, keypoints.right_shoulder],
  [keypoints.left_hip, keypoints.left_knee],
  [keypoints.left_knee, keypoints.left_ankle],
  [keypoints.right_hip, keypoints.right_knee],
  [keypoints.right_knee, keypoints.right_ankle],
  [keypoints.left_hip, keypoints.right_hip],
  [keypoints.left_shoulder, keypoints.left_hip],
  [keypoints.right_shoulder, keypoints.right_hip],
  [keypoints.nose, keypoints.left_eye],
  [keypoints.left_eye, keypoints.left_ear],
  [keypoints.nose, keypoints.right_eye],
  [keypoints.right_eye, keypoints.right_ear],
] as const;
