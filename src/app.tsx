import { useState } from "preact/hooks";
import { Navigation } from "./ui/Navigation";
import { WorkoutPage } from "./ui/WorkoutPage";
import { SessionsPage } from "./ui/SessionsPage";
import styles from "./App.module.css";

export function App() {
  const [currentPage, setCurrentPage] = useState<'workout' | 'sessions'>('workout');

  return (
    <div className={styles.app}>
      <Navigation currentPage={currentPage} onPageChange={setCurrentPage} />
      <main className={styles.main}>
        {currentPage === 'workout' ? <WorkoutPage /> : <SessionsPage />}
      </main>
    </div>
  );
}
