import { useCallback } from "preact/hooks";
import { useServicesStore } from "../../../shared/store/services-store";
import { useWorkoutStore } from "../../../shared/store/workout-store";

/**
 * Hook for workout actions using the new services store coordination
 */
export const useWorkoutActions = () => {
  const {
    prepareCamera,
    startWorkoutSession,
    stopWorkoutSession,
    updateSettings,
    playCountdownBeep,
    playStartBeep,
    servicesInitialized,
  } = useServicesStore();

  const {
    setError,
    setCountdown,
    setSessionActive,
    settings,
  } = useWorkoutStore();

  const prepareCameraAndCanvas = useCallback(
    async (video: HTMLVideoElement, canvas: HTMLCanvasElement) => {
      if (!servicesInitialized) {
        setError("Services not initialized");
        return;
      }

      try {
        setError(null);
        await prepareCamera(video, canvas);
      } catch (error) {
        setError("Failed to initialize camera. Please check permissions.");
        console.error("Camera preparation failed:", error);
      }
    },
    [servicesInitialized, prepareCamera, setError]
  );

  const startCountdown = useCallback(
    async (duration: number, video: HTMLVideoElement) => {
      if (!servicesInitialized) return;

      let count = duration;
      if (count === 0) {
        await startSession(video);
        return;
      }

      setCountdown(count);
      await playCountdownBeep();

      const countdownInterval = window.setInterval(async () => {
        count--;
        if (count > 0) {
          setCountdown(count);
          await playCountdownBeep();
        } else {
          setCountdown(null);
          clearInterval(countdownInterval);
          await playStartBeep();
          await startSession(video);
        }
      }, 1000);
    },
    [servicesInitialized, playCountdownBeep, playStartBeep, setCountdown]
  );

  const startSession = useCallback(
    async (video: HTMLVideoElement) => {
      if (!servicesInitialized) return;

      try {
        setError(null);
        await startWorkoutSession(video);
        setSessionActive(true);
      } catch (error) {
        setError("Failed to start workout session. Please try again.");
        console.error("Start session failed:", error);
      }
    },
    [servicesInitialized, startWorkoutSession, setSessionActive, setError]
  );

  const stopSession = useCallback(async () => {
    if (!servicesInitialized) return;

    try {
      const session = await stopWorkoutSession();
      setSessionActive(false);
      return session;
    } catch (error) {
      setError("Failed to stop workout session.");
      console.error("Stop session failed:", error);
      return null;
    }
  }, [servicesInitialized, stopWorkoutSession, setSessionActive, setError]);

  const clearCountdown = useCallback(() => {
    setCountdown(null);
  }, [setCountdown]);

  const handleSettingsUpdate = useCallback(
    (newSettings: NonNullable<typeof settings>) => {
      updateSettings(newSettings);
    },
    [updateSettings]
  );

  return {
    prepareCameraAndCanvas,
    startCountdown,
    startSession,
    stopSession,
    clearCountdown,
    updateSettings: handleSettingsUpdate,
    isReady: servicesInitialized,
  };
};