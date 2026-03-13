import type { PropsWithChildren } from "react";
import {
  ClockCounterClockwise,
  Database,
  Gear,
  House,
  ListChecks,
  Pulse,
  SlidersHorizontal,
  User,
  Wrench,
  Waveform,
  SignOut
} from "@phosphor-icons/react";
import { useLocation } from "react-router-dom";
import { SidebarNavItem } from "../components/layout/SidebarNavItem";
import { Button, StatusPill } from "../components/ui";

const navItems = [
  { to: "/", label: "Dashboard", subtitle: "Overview", icon: House, end: true },
  { to: "/facts", label: "Memorias", subtitle: "Facts memory", icon: Database },
  { to: "/tasks", label: "Tarefas", subtitle: "Execution board", icon: ListChecks },
  { to: "/conversations", label: "Historico", subtitle: "Conversation turns", icon: ClockCounterClockwise },
  { to: "/tool-calls", label: "Tool Calls", subtitle: "Execution trace", icon: Wrench },
  { to: "/settings", label: "Perfil", subtitle: "User settings", icon: Gear }
];

const routeTitles: Record<string, string> = {
  "/": "Dashboard",
  "/facts": "Memorias",
  "/tasks": "Tasks",
  "/conversations": "Conversations",
  "/tool-calls": "Tool Calls",
  "/settings": "Settings"
};

export function AppShell({ children }: PropsWithChildren) {
  const location = useLocation();
  const currentTitle = routeTitles[location.pathname] ?? "Sara Core";

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand__icon">
            <Waveform weight="duotone" />
          </div>
          <div>
            <h1>Sara Core</h1>
            <p>Offline Assistant Platform</p>
          </div>
        </div>

        <div className="sidebar-status">
          <StatusPill tone="success">Local Mode Active</StatusPill>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <SidebarNavItem key={item.to} {...item} />
          ))}
        </nav>

        <div className="sidebar-footer">
          <Button variant="ghost" className="sidebar-footer__button">
            <SignOut weight="duotone" />
            Exit Session
          </Button>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <div className="app-topbar__title">
            <p>Sara Workspace</p>
            <h2>{currentTitle}</h2>
          </div>
          <div className="app-topbar__actions">
            <span className="topbar-chip">
              <Pulse weight="duotone" />
              API Online
            </span>
            <span className="topbar-chip">
              <SlidersHorizontal weight="duotone" />
              Typed Contracts
            </span>
            <span className="topbar-chip">
              <User weight="duotone" />
              Local Profile
            </span>
          </div>
        </header>

        <main className="app-content">
          <div className="app-content__container">{children}</div>
        </main>
      </div>
    </div>
  );
}
