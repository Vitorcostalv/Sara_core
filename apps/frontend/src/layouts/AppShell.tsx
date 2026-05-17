import type { PropsWithChildren } from "react";
import { Broadcast, Leaf, Waveform } from "@phosphor-icons/react";
import { useLocation } from "react-router-dom";
import { SidebarNavItem } from "../components/layout/SidebarNavItem";

const navItems = [
  {
    to: "/voice",
    label: "Voice",
    subtitle: "Audio e conversa",
    icon: Broadcast
  },
  {
    to: "/ecology",
    label: "Ecologia",
    subtitle: "Dados e simulacoes",
    icon: Leaf
  },
];

const routeMeta: Record<
  string,
  {
    title: string;
    description: string;
  }
> = {
  "/": {
    title: "Voice",
    description: "Teste audio, revise a resposta e acompanhe o resultado."
  },
  "/voice": {
    title: "Voice",
    description: "Teste audio, revise a resposta e acompanhe o resultado."
  },
  "/ecology": {
    title: "Ecologia",
    description: "Consulte dados ecologicos grounded, explore simulacoes e navegue pelo catalogo ambiental."
  },
};

export function AppShell({ children }: PropsWithChildren) {
  const location = useLocation();
  const pageMeta = routeMeta[location.pathname] ?? {
    title: "Sara Core",
    description: "Uma interface de validacao clara e objetiva."
  };

  return (
    <div className="app-shell">
      <div className="app-shell__ambient" aria-hidden="true" />

      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand__crest">
            <Waveform weight="duotone" />
          </div>
          <div className="sidebar-brand__copy">
            <span>Sara Core</span>
            <h1>Workspace</h1>
            <p>Uma interface clara para testar voz, respostas e execucoes.</p>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <SidebarNavItem key={item.to} {...item} />
          ))}
        </nav>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <div className="app-topbar__intro">
            <h2>{pageMeta.title}</h2>
            <p>{pageMeta.description}</p>
          </div>
        </header>

        <main className="app-content">
          <div className="app-content__container">{children}</div>
        </main>
      </div>
    </div>
  );
}
