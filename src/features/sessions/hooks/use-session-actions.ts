import { useCallback } from "preact/hooks";
import { useServicesStore } from "../../../shared/store/services-store";

/**
 * Hook for session actions using direct store access
 */
export const useSessionActions = () => {
  const storageService = useServicesStore((state) => state.storageService);

  const viewRecording = useCallback(
    async (sessionId: string) => {
      if (!storageService) return;

      try {
        const workout = await storageService.getWorkout(sessionId);
        if (workout?.videoBlob) {
          const videoUrl = URL.createObjectURL(workout.videoBlob);
          window.open(videoUrl, "_blank");
        }
      } catch (error) {
        console.error("Failed to view recording:", error);
      }
    },
    [storageService]
  );

  const downloadRecording = useCallback(
    async (sessionId: string) => {
      if (!storageService) return;

      try {
        const workout = await storageService.getWorkout(sessionId);
        if (workout?.videoBlob) {
          const url = URL.createObjectURL(workout.videoBlob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `workout-${sessionId}.webm`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      } catch (error) {
        console.error("Failed to download recording:", error);
      }
    },
    [storageService]
  );

  const deleteSession = useCallback(
    async (sessionId: string, onSuccess: (id: string) => void) => {
      if (!storageService) return;

      if (confirm("Are you sure you want to delete this session?")) {
        try {
          await storageService.deleteWorkout(sessionId);
          onSuccess(sessionId);
        } catch (error) {
          console.error("Failed to delete session:", error);
        }
      }
    },
    [storageService]
  );

  return {
    viewRecording,
    downloadRecording,
    deleteSession,
  };
};