import { useEffect } from "preact/hooks";
import { WorkoutPage } from "./workout/workout-page";
import { ModelLoadingPopup } from "./components/model-loading-popup";
import { CheckStoragePopup } from "./components/check-storage-popup";
import { modelLoaderService } from "@/application/services/model-loader";
import styles from "./app.module.css";

export function App() {
  useEffect(() => {
    modelLoaderService.load();
  }, []);

  return (
    <div className={styles.app}>
      <main className={styles.main}>
        <WorkoutPage />
      </main>
      <ModelLoadingPopup />
      <CheckStoragePopup />
    </div>
  );
}
