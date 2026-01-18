import { Icon } from "./icon";
import styles from "./info-button.module.css";

const REPO_URL = "https://github.com/isidrok/kb-sport-app";

export function InfoButton() {
  const handleClick = () => {
    window.open(REPO_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <button
      className={styles.infoButton}
      onClick={handleClick}
      aria-label="About the app"
      title="About the app"
    >
      <Icon name="info" className={styles.icon} />
    </button>
  );
}
