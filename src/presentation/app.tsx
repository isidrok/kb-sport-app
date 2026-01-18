import { useEffect } from "preact/hooks";
import { WorkoutPage } from "./workout/workout-page";
import { loadModel } from "@/infrastructure/model-loader";
import styles from "./app.module.css";

export function App() {
  useEffect(() => {
    loadModel().catch(() => {
      // Error is handled by model loader and published as event
    });
  }, []);

  return (
    <div className={styles.app}>
      <main className={styles.main}>
        <WorkoutPage />
      </main>
    </div>
  );
}
