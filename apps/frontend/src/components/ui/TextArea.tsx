import { useId, type TextareaHTMLAttributes } from "react";
import { cn } from "./utils";

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
}

export function TextArea({ label, hint, className, id, ...props }: TextAreaProps) {
  const generatedId = useId();
  const inputId = id ?? props.name ?? generatedId;

  if (!label) {
    return <textarea id={inputId} className={cn("ui-textarea", className)} {...props} />;
  }

  return (
    <label className="ui-input-field" htmlFor={inputId}>
      <span className="ui-input-field__label">{label}</span>
      <textarea id={inputId} className={cn("ui-textarea", className)} {...props} />
      {hint ? <small className="ui-input-field__hint">{hint}</small> : null}
    </label>
  );
}
