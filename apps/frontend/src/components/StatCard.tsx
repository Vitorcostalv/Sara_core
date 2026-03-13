import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  hint: string;
  icon?: ReactNode;
}

export function StatCard({ label, value, hint, icon }: StatCardProps) {
  return (
    <article className="stat-card">
      <div className="stat-card-top">
        <span>{label}</span>
        {icon ? <span>{icon}</span> : null}
      </div>
      <strong>{value}</strong>
      <small>{hint}</small>
    </article>
  );
}
