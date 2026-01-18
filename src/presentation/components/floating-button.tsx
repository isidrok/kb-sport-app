import { Icon } from "@/presentation/components/icon";
import styles from "./floating-button.module.css";

interface FloatingButtonProps {
  icon: string;
  onClick: () => void;
  disabled?: boolean;
  testId?: string;
  className?: string;
  ariaLabel?: string;
  active?: boolean;
}

export function FloatingButton({
  icon,
  onClick,
  disabled = false,
  testId,
  className,
  ariaLabel,
  active = false,
}: FloatingButtonProps) {
  const buttonClass = `${styles.floatingButton} ${active ? styles.active : ""} ${className || ""}`;
  
  return (
    <button
      className={buttonClass}
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      aria-label={ariaLabel}
    >
      <Icon name={icon} className={styles.floatingButtonIcon} />
    </button>
  );
}
