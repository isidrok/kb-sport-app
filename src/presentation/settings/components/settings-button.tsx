import { FloatingButton } from "@/presentation/components/floating-button";

interface SettingsButtonProps {
  onClick: () => void;
  isDisabled: boolean;
}

export function SettingsButton({ onClick, isDisabled }: SettingsButtonProps) {
  return (
    <FloatingButton
      icon="settings"
      onClick={onClick}
      disabled={isDisabled}
      testId="settings-button"
    />
  );
}
