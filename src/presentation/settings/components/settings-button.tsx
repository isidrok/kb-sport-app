import { Icon } from "@/presentation/components/icon";
import styles from "./settings-button.module.css";

interface SettingsButtonProps {
  onClick: () => void;
  isDisabled: boolean;
}

export function SettingsButton({ onClick, isDisabled }: SettingsButtonProps) {
  return (
    <button
      className={styles.settingsButton}
      onClick={onClick}
      data-testid="settings-button"
      disabled={isDisabled}
    >
      <Icon name="settings" className={styles.buttonIcon} />
    </button>
  );
}
