import { formatDuration } from "../../utils/time-utils";

export const formatSessionTime = (startTime: number): string => {
  const elapsed = Date.now() - startTime;
  return formatDuration(elapsed);
};

export const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Re-export time utils for convenience
export { formatDuration } from "../../utils/time-utils";