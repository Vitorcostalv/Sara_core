import type { SelectHTMLAttributes } from "react";
import { cn } from "./utils";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
}

export function Select({ label, hint, className, id, children, ...props }: SelectProps) {
  const inputId = id ?? props.name;

  if (!label) {
    return (
      <select id={inputId} className={cn("ui-select", className)} {...props}>
        {children}
      </select>
    );
  }

  return (
    <label className="ui-input-field" htmlFor={inputId}>
      <span className="ui-input-field__label">{label}</span>
      <select id={inputId} className={cn("ui-select", className)} {...props}>
        {children}
      </select>
      {hint ? <small className="ui-input-field__hint">{hint}</small> : null}
    </label>
  );
}
