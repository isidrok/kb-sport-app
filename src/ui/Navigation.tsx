import styles from './Navigation.module.css';

interface NavigationProps {
  currentPage: 'workout' | 'sessions';
  onPageChange: (page: 'workout' | 'sessions') => void;
}

export function Navigation({ currentPage, onPageChange }: NavigationProps) {
  return (
    <nav className={styles.nav}>
      <button
        className={`${styles.navButton} ${currentPage === 'workout' ? styles.active : ''}`}
        onClick={() => onPageChange('workout')}
      >
        Workout
      </button>
      <button
        className={`${styles.navButton} ${currentPage === 'sessions' ? styles.active : ''}`}
        onClick={() => onPageChange('sessions')}
      >
        Sessions
      </button>
    </nav>
  );
}