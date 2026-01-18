import { useState, useEffect } from "preact/hooks";
import { storageCheckService } from "@/application/services/storage-check.service";

export interface StorageStatus {
  isOPFSSupported: boolean;
  hasEnoughSpace: boolean;
  spaceInMB: number;
  isChecked: boolean;
}

/**
 * Hook to check storage status and provide reactive state
 */
export function useStorageStatus() {
  const [status, setStatus] = useState<StorageStatus>({
    isOPFSSupported: false,
    hasEnoughSpace: false,
    spaceInMB: 0,
    isChecked: false,
  });

  useEffect(() => {
    async function checkStorage() {
      const result = await storageCheckService.checkStorage();
      setStatus({
        isOPFSSupported: result.isOPFSSupported,
        hasEnoughSpace: result.hasEnoughSpace,
        spaceInMB: result.spaceInMB,
        isChecked: true,
      });
    }

    checkStorage();
  }, []);

  return status;
}
