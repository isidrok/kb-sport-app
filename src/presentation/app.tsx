import { useEffect } from "preact/hooks";
import { WorkoutPage } from "./workout/workout-page";
import { modelLoaderService } from "@/application/model-loader";
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
    </div>
  );
}
