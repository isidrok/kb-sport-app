import styles from "./status-popup.module.css";
import { Icon } from "./icon";

interface StatusPopupProps {
  message?: string;
  icon?: string;
  visible: boolean;
}

export function StatusPopup({ message, icon, visible }: StatusPopupProps) {
  if (!visible) return null;

  return (
    <div className={styles.statusPopup}>
      {icon && (
        <div className={styles.iconContainer}>
          <Icon name={icon} className={styles.loadingIcon} />
        </div>
      )}
      {message && <span className={styles.message}>{message}</span>}
    </div>
  );
}
