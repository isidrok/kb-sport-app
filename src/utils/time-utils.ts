/**
 * Format milliseconds duration to MM:SS format
 */
export function formatDuration(durationMs: number): string {
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Calculate current session duration from start time
 */
export function calculateSessionDuration(startTime: number): number {
  return Date.now() - startTime;
}