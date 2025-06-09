import { useEffect } from "preact/hooks";
import { useServicesStore } from "../store/services-store";

/**
 * Hook to ensure services are initialized when the app starts
 */
export const useServicesInitialization = () => {
  const {
    servicesInitialized,
    initializationError,
    initializeServices,
  } = useServicesStore();

  useEffect(() => {
    if (!servicesInitialized && !initializationError) {
      initializeServices();
    }
  }, [servicesInitialized, initializationError, initializeServices]);

  return {
    servicesInitialized,
    initializationError,
  };
};