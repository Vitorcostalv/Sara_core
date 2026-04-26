import { useId, type InputHTMLAttributes } from "react";
import { cn } from "./utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}

export function Input({ label, hint, className, id, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? props.name ?? generatedId;

  if (!label) {
    return <input id={inputId} className={cn("ui-input", className)} {...props} />;
  }

  return (
    <label className="ui-input-field" htmlFor={inputId}>
      <span className="ui-input-field__label">{label}</span>
      <input id={inputId} className={cn("ui-input", className)} {...props} />
      {hint ? <small className="ui-input-field__hint">{hint}</small> : null}
    </label>
  );
}
