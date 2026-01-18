import { useState, useCallback } from "preact/hooks";
import { workoutStorageAdapter } from "@/infrastructure/adapters/workout-storage.adapter";
import { WorkoutSummary, WorkoutMetadata } from "@/domain/types/workout-storage.types";

export interface UseWorkoutHistoryReturn {
  workouts: WorkoutSummary[];
  isLoading: boolean;
  deletingWorkoutId: string | null;
  viewingWorkoutId: string | null;
  workoutMetadata: WorkoutMetadata | null;
  isLoadingMetadata: boolean;
  loadWorkouts: () => Promise<void>;
  viewWorkout: (workoutId: string) => Promise<void>;
  viewWorkoutDetails: (workoutId: string) => Promise<void>;
  closeWorkoutDetails: () => void;
  downloadWorkout: (workoutId: string) => Promise<void>;
  deleteWorkout: (workoutId: string) => void;
  confirmDelete: (workoutId: string) => Promise<void>;
  cancelDelete: () => void;
}

export function useWorkoutHistory(): UseWorkoutHistoryReturn {
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingWorkoutId, setDeletingWorkoutId] = useState<string | null>(
    null
  );
  const [viewingWorkoutId, setViewingWorkoutId] = useState<string | null>(null);
  const [workoutMetadata, setWorkoutMetadata] = useState<WorkoutMetadata | null>(
    null
  );
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);

  const loadWorkouts = useCallback(async () => {
    setIsLoading(true);
    const storedWorkouts = await workoutStorageAdapter.getWorkouts();
    setWorkouts(storedWorkouts);
    setIsLoading(false);
  }, []);

  async function viewWorkout(workoutId: string) {
    const videoBlob = await workoutStorageAdapter.getWorkoutVideo(workoutId);
    const videoUrl = URL.createObjectURL(videoBlob);
    window.open(videoUrl, "_blank");
  }

  async function viewWorkoutDetails(workoutId: string) {
    // Toggle: if clicking the same workout, close it
    if (viewingWorkoutId === workoutId) {
      setViewingWorkoutId(null);
      setWorkoutMetadata(null);
      return;
    }

    // Load new workout details
    setIsLoadingMetadata(true);
    setViewingWorkoutId(workoutId);
    try {
      const metadata = await workoutStorageAdapter.getWorkoutMetadata(workoutId);
      setWorkoutMetadata(metadata);
    } catch (error) {
      console.error("Failed to load workout metadata:", error);
      setWorkoutMetadata(null);
    } finally {
      setIsLoadingMetadata(false);
    }
  }

  function closeWorkoutDetails() {
    setViewingWorkoutId(null);
    setWorkoutMetadata(null);
  }

  async function downloadWorkout(workoutId: string) {
    const videoBlob = await workoutStorageAdapter.getWorkoutVideo(workoutId);
    const videoUrl = URL.createObjectURL(videoBlob);

    const now = new Date();
    const filename = `workout_${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_${String(
      now.getHours()
    ).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}-${String(
      now.getSeconds()
    ).padStart(2, "0")}.webm`;

    const anchor = document.createElement("a");
    anchor.href = videoUrl;
    anchor.download = filename;
    anchor.style.display = "none";

    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }

  function deleteWorkout(workoutId: string) {
    setDeletingWorkoutId(workoutId);
  }

  async function confirmDelete(workoutId: string) {
    try {
      await workoutStorageAdapter.deleteWorkout(workoutId);
      setDeletingWorkoutId(null);
      await loadWorkouts();
    } catch (error) {
      console.error("Failed to delete workout:", error);
      setDeletingWorkoutId(null);
    }
  }

  function cancelDelete() {
    setDeletingWorkoutId(null);
  }

  return {
    workouts,
    isLoading,
    deletingWorkoutId,
    viewingWorkoutId,
    workoutMetadata,
    isLoadingMetadata,
    loadWorkouts,
    viewWorkout,
    viewWorkoutDetails,
    closeWorkoutDetails,
    downloadWorkout,
    deleteWorkout,
    confirmDelete,
    cancelDelete,
  };
}
