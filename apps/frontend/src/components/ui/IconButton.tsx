import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./utils";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
}

export function IconButton({ icon, label, className, type = "button", ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn("ui-icon-button", className)}
      {...props}
    >
      {icon}
    </button>
  );
}
