/**
 * Maps keypoint names to their corresponding indices in the YOLOv8 pose detection output.
 * YOLOv8 uses the COCO keypoint format with 17 keypoints.
 */
export const keypointNames = {
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
  [keypointNames.left_shoulder, keypointNames.left_elbow],
  [keypointNames.left_elbow, keypointNames.left_wrist],
  [keypointNames.right_shoulder, keypointNames.right_elbow],
  [keypointNames.right_elbow, keypointNames.right_wrist],
  [keypointNames.left_shoulder, keypointNames.right_shoulder],
  [keypointNames.left_hip, keypointNames.left_knee],
  [keypointNames.left_knee, keypointNames.left_ankle],
  [keypointNames.right_hip, keypointNames.right_knee],
  [keypointNames.right_knee, keypointNames.right_ankle],
  [keypointNames.left_hip, keypointNames.right_hip],
  [keypointNames.left_shoulder, keypointNames.left_hip],
  [keypointNames.right_shoulder, keypointNames.right_hip],
  [keypointNames.nose, keypointNames.left_eye],
  [keypointNames.left_eye, keypointNames.left_ear],
  [keypointNames.nose, keypointNames.right_eye],
  [keypointNames.right_eye, keypointNames.right_ear],
] as const;
