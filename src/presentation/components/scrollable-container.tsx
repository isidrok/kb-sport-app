import { ComponentChildren } from "preact";
import styles from "./scrollable-container.module.css";

interface ScrollableContainerProps {
  children: ComponentChildren;
  className?: string;
}

export function ScrollableContainer({ children, className }: ScrollableContainerProps) {
  return (
    <div className={`${styles.scrollableContainer} ${className || ""}`}>
      {children}
    </div>
  );
}
