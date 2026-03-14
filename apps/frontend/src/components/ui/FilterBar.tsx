import type { ReactNode } from "react";
import { cn } from "./utils";

interface FilterBarProps {
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function FilterBar({ children, actions, className }: FilterBarProps) {
  return (
    <div className={cn("ui-filter-bar", className)}>
      <div className="ui-filter-bar__inputs">{children}</div>
      {actions ? <div className="ui-filter-bar__actions">{actions}</div> : null}
    </div>
  );
}
