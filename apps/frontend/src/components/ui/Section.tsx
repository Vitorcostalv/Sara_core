import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./utils";

interface SectionProps extends HTMLAttributes<HTMLElement> {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function Section({ title, subtitle, actions, className, children, ...props }: SectionProps) {
  return (
    <section className={cn("ui-section", className)} {...props}>
      {title || subtitle || actions ? (
        <div className="ui-section__header">
          <div>
            {title ? <h3>{title}</h3> : null}
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          {actions ? <div>{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
