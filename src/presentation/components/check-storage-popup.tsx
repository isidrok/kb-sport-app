import { useState, useEffect } from "preact/hooks";
import { useStorageStatus } from "../hooks/use-storage-status";
import { StatusPopup } from "./status-popup";

/**
 * Component that shows a dismissable warning when storage is insufficient or unsupported.
 * Only renders after storage check has been completed.
 */
export function CheckStoragePopup() {
  const [isDismissed, setIsDismissed] = useState(false);
  const { isOPFSSupported, hasEnoughSpace, spaceInMB, isChecked } = useStorageStatus();

  // Don't render until storage check has been performed
  if (!isChecked) {
    return null;
  }

  // Determine if we should show a warning
  const hasStorageIssue = !isOPFSSupported || !hasEnoughSpace;
  const showWarning = hasStorageIssue && !isDismissed;

  // Generate warning message based on the specific issue
  let warningMessage: string | null = null;
  if (hasStorageIssue) {
    if (!isOPFSSupported) {
      warningMessage = "Access to storage is not supported in this browser. Try updating to the latest version of Chrome, Edge, or Safari. Workout will start without recording.";
    } else if (!hasEnoughSpace) {
      warningMessage = `Not enough storage space (${spaceInMB} MB available, 200 MB needed). Video recording disabled for this workout.`;
    }
  }

  const dismissWarning = () => {
    setIsDismissed(true);
  };

  // Reset dismissed state if storage status changes
  useEffect(() => {
    setIsDismissed(false);
  }, [isOPFSSupported, hasEnoughSpace]);

  return (
    <StatusPopup
      visible={showWarning}
      icon="warning"
      message={warningMessage || ""}
      onClose={dismissWarning}
      kind="warning"
    />
  );
}
