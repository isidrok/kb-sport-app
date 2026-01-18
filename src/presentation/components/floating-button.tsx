import { Icon } from "@/presentation/components/icon";
import styles from "./floating-button.module.css";

interface FloatingButtonProps {
  icon: string;
  onClick: () => void;
  disabled?: boolean;
  testId?: string;
  className?: string;
}

export function FloatingButton({
  icon,
  onClick,
  disabled = false,
  testId,
  className,
}: FloatingButtonProps) {
  return (
    <button
      className={`${styles.floatingButton} ${className || ""}`}
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
    >
      <Icon name={icon} className={styles.floatingButtonIcon} />
    </button>
  );
}
