import styles from "./status-popup.module.css";
import { Icon } from "./icon";
import { CloseButton } from "./close-button";

interface StatusPopupProps {
  message?: string;
  icon?: string;
  visible: boolean;
  onClose?: () => void;
  kind?: "info" | "warning" | "error";
}

export function StatusPopup({ message, icon, visible, onClose, kind = "info" }: StatusPopupProps) {
  if (!visible) return null;

  const popupClass = `${styles.statusPopup} ${styles[kind]}`;

  return (
    <div className={popupClass}>
      <div className={styles.content}>
        {icon && (
          <div className={styles.iconContainer}>
            <Icon name={icon} className={styles.icon} />
          </div>
        )}
        {message && <span className={styles.message}>{message}</span>}
      </div>
      {onClose && (
        <div className={styles.closeButtonWrapper}>
          <CloseButton onClick={onClose} />
        </div>
      )}
    </div>
  );
}
