import type { Icon } from "@phosphor-icons/react";
import { NavLink } from "react-router-dom";

interface SidebarNavItemProps {
  to: string;
  label: string;
  icon: Icon;
  subtitle?: string;
  end?: boolean;
}

export function SidebarNavItem({ to, label, icon: IconComponent, subtitle, end }: SidebarNavItemProps) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `sidebar-nav-item${isActive ? " is-active" : ""}`}>
      <span className="sidebar-nav-item__icon" aria-hidden="true">
        <IconComponent weight="duotone" />
      </span>
      <span className="sidebar-nav-item__content">
        <strong>{label}</strong>
        {subtitle ? <small>{subtitle}</small> : null}
      </span>
    </NavLink>
  );
}
