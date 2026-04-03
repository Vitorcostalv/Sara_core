import type { PropsWithChildren } from "react";
import {
  ClockCounterClockwise,
  Pulse,
  SlidersHorizontal,
  Wrench,
  Waveform,
} from "@phosphor-icons/react";
import { useLocation } from "react-router-dom";
import { SidebarNavItem } from "../components/layout/SidebarNavItem";
import { StatusPill } from "../components/ui";

const navItems = [
  { to: "/conversations", label: "Voice Validation", subtitle: "STT by file", icon: ClockCounterClockwise },
  { to: "/tool-calls", label: "Tool Calls", subtitle: "Execution trace", icon: Wrench },
];

const routeTitles: Record<string, string> = {
  "/": "Voice Validation",
  "/conversations": "Voice Validation",
  "/tool-calls": "Tool Calls",
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
              Local Backend
            </span>
            <span className="topbar-chip">
              <SlidersHorizontal weight="duotone" />
              Shared Contracts
            </span>
            <span className="topbar-chip">
              <Waveform weight="duotone" />
              STT Validation
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
