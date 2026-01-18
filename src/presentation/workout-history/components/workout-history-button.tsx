import { FloatingButton } from "@/presentation/components/floating-button";

interface WorkoutHistoryButtonProps {
  onClick: () => void;
  isDisabled: boolean;
}

export function WorkoutHistoryButton({
  onClick,
  isDisabled,
}: WorkoutHistoryButtonProps) {
  return (
    <FloatingButton
      icon="history"
      onClick={onClick}
      disabled={isDisabled}
      testId="history-button"
    />
  );
}
