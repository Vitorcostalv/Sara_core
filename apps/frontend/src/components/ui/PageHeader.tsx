import type { ReactNode } from "react";
import { Badge } from "./Badge";

interface PageHeaderProps {
  title: string;
  description: string;
  icon?: ReactNode;
  badge?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, icon, badge, actions }: PageHeaderProps) {
  return (
    <header className="ui-page-header">
      <div className="ui-page-header__main">
        {icon ? <div className="ui-page-header__icon">{icon}</div> : null}
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
          {badge ? <Badge tone="info">{badge}</Badge> : null}
        </div>
      </div>
      {actions ? <div className="ui-page-header__actions">{actions}</div> : null}
    </header>
  );
}
