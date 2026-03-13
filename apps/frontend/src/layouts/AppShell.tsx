import type { PropsWithChildren } from "react";
import {
  ClockCounterClockwise,
  Database,
  Gear,
  House,
  ListChecks,
  Microphone,
  SignOut,
  Sparkle,
  User,
  Waveform
} from "@phosphor-icons/react";
import { useLocation } from "react-router-dom";
import { SidebarNavItem } from "../components/layout/SidebarNavItem";
import { TopbarAction } from "../components/layout/TopbarAction";
import { Button, StatusPill } from "../components/ui";

const navItems = [
  { to: "/", label: "Dashboard", subtitle: "Overview", icon: House, end: true },
  { to: "/tasks", label: "Tasks", subtitle: "Day planning", icon: ListChecks },
  { to: "/facts", label: "Memories", subtitle: "Facts memory", icon: Database },
  { to: "/conversations", label: "History", subtitle: "Conversation log", icon: ClockCounterClockwise },
  { to: "/settings", label: "Settings", subtitle: "Local setup", icon: Gear }
];

const routeTitles: Record<string, string> = {
  "/": "Dashboard",
  "/tasks": "Tasks",
  "/facts": "Memories",
  "/conversations": "Conversations",
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
            <TopbarAction icon={Microphone} label="Voice stack pending integration" />
            <TopbarAction icon={Sparkle} label="Local intelligence layer pending integration" />
            <TopbarAction icon={User} label="Active profile" />
          </div>
        </header>

        <main className="app-content">
          <div className="app-content__container">{children}</div>
        </main>
      </div>
    </div>
  );
}
