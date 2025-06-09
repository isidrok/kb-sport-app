import styles from './navigation.module.css';

interface NavigationProps {
  currentPage: 'workout' | 'sessions';
  onPageChange: (page: 'workout' | 'sessions') => void;
}

export function Navigation({ currentPage, onPageChange }: NavigationProps) {
  const handleToggle = () => {
    onPageChange(currentPage === 'workout' ? 'sessions' : 'workout');
  };

  return (
    <button
      className={styles.floatingToggle}
      onClick={handleToggle}
      title={`Switch to ${currentPage === 'workout' ? 'Sessions' : 'Workout'}`}
    >
      {currentPage === 'workout' ? '📊' : '🦾'}
    </button>
  );
}