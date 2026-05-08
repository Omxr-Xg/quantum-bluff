import { ReactNode } from "react";

type CustomScrollAreaProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

/** Zone scrollable avec la barre native du navigateur / OS uniquement (pas de rail personnalisé). */
export function CustomScrollArea({ children, className = "", contentClassName = "" }: CustomScrollAreaProps) {
  return (
    <div className={`relative min-h-0 ${className}`}>
      <div className={`h-full min-h-0 overflow-y-auto ${contentClassName}`}>{children}</div>
    </div>
  );
}
