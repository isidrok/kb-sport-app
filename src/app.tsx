import { useState } from "preact/hooks";
import { Navigation } from "./shared/components/ui/navigation";
import { WorkoutPage } from "./features/workout/components/workout-page";
import { SessionsPage } from "./features/sessions/components/sessions-page";
import styles from "./app.module.css";

export function App() {
  const [currentPage, setCurrentPage] = useState<"workout" | "sessions">(
    "workout"
  );

  return (
    <div className={styles.app}>
      <Navigation currentPage={currentPage} onPageChange={setCurrentPage} />
      <main className={styles.main}>
        {currentPage === "workout" ? <WorkoutPage /> : <SessionsPage />}
      </main>
    </div>
  );
}
