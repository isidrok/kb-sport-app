import { Icon } from "@/presentation/components/icon";
import styles from "./action-button.module.css";

interface ActionButtonProps {
  onClick: () => void;
  icon?: string;
  children: string;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  fullWidth?: boolean;
}

export function ActionButton({
  onClick,
  icon,
  children,
  variant = "primary",
  disabled = false,
  fullWidth = false,
}: ActionButtonProps) {
  const className = `${styles.actionButton} ${styles[variant]} ${fullWidth ? styles.fullWidth : ""}`;

  return (
    <button
      className={className}
      onClick={onClick}
      disabled={disabled}
    >
      {icon && <Icon name={icon} className={styles.icon} />}
      {children}
    </button>
  );
}
