import { useModelLoading } from "../hooks/use-model-loading";
import { StatusPopup } from "./status-popup";

/**
 * Component that shows model loading status and errors.
 */
export function ModelLoadingPopup() {
  const { status, message } = useModelLoading();

  const showStatusPopup = status === "loading" || status === "error";

  return (
    <StatusPopup
      visible={showStatusPopup}
      icon={status === "error" ? "error" : "hourglass_empty"}
      message={message}
      kind={status === "error" ? "error" : "info"}
    />
  );
}
