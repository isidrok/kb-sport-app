import { Icon } from "@/presentation/components/icon";
import styles from "./close-button.module.css";

interface CloseButtonProps {
  onClick: () => void;
  ariaLabel?: string;
}

export function CloseButton({ onClick, ariaLabel = "Close" }: CloseButtonProps) {
  return (
    <button
      className={styles.closeButton}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      <Icon name="close" />
    </button>
  );
}
