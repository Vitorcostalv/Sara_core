import type { HTMLAttributes } from "react";
import { cn } from "./utils";

type StatusTone = "neutral" | "success" | "warning" | "error" | "info";

interface StatusPillProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: StatusTone;
}

export function StatusPill({ tone = "neutral", className, ...props }: StatusPillProps) {
  return <span className={cn("ui-status-pill", `ui-status-pill--${tone}`, className)} {...props} />;
}
