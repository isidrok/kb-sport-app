import { useState, useEffect } from "preact/hooks";
import { useServicesStore } from "../../../shared/store/services-store";
import { WorkoutMetadata } from "../../../service/storage.service";

/**
 * Hook for loading sessions data using direct store access
 */
export const useSessionsData = () => {
  const storageService = useServicesStore((state) => state.storageService);
  const [sessions, setSessions] = useState<WorkoutMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (storageService) {
      loadSessions();
    }
  }, [storageService]);

  const loadSessions = async () => {
    if (!storageService) return;

    try {
      setLoading(true);
      setError(null);
      const workouts = await storageService.getAllWorkouts();
      setSessions(workouts);
    } catch (err) {
      setError("Failed to load workout sessions");
      console.error("Failed to load sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  const refreshSessions = () => {
    loadSessions();
  };

  return {
    sessions,
    loading,
    error,
    refreshSessions,
  };
};