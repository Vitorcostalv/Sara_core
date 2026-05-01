import { useEffect, useState, type PropsWithChildren } from "react";
import {
  ArrowsClockwise,
  Broadcast,
  Command,
  Pulse,
  ShieldCheck,
  Sparkle,
  Waveform,
  Wrench
} from "@phosphor-icons/react";
import { useLocation } from "react-router-dom";
import { SidebarNavItem } from "../components/layout/SidebarNavItem";
import { StatusPill } from "../components/ui";
import { healthApi } from "../services/api/client";
import { useUiStore } from "../state/ui.store";

const navItems = [
  {
    to: "/voice",
    label: "Voice",
    subtitle: "Capture, transcribe, inspect",
    icon: Broadcast
  },
  {
    to: "/llm",
    label: "LLM",
    subtitle: "Grounding, context, answer",
    icon: Sparkle
  },
  {
    to: "/tool-calls",
    label: "Tool Calls",
    subtitle: "Trace, payload, outcome",
    icon: Wrench
  }
];

const routeMeta: Record<
  string,
  {
    kicker: string;
    title: string;
    description: string;
  }
> = {
  "/": {
    kicker: "Deck de validacao",
    title: "Voice",
    description: "Capture sinal, inspecione a transcricao e confirme a qualidade da resposta."
  },
  "/voice": {
    kicker: "Deck de validacao",
    title: "Voice",
    description: "Capture sinal, inspecione a transcricao e confirme a qualidade da resposta."
  },
  "/llm": {
    kicker: "Bancada de grounding",
    title: "LLM",
    description: "Audite prompt, montagem de contexto, warnings e resposta do provider."
  },
  "/tool-calls": {
    kicker: "Trilha de observabilidade",
    title: "Tool Calls",
    description: "Revise traces, payloads e mudancas de estado sem poluicao visual."
  }
};

function formatRuntimeLabel(apiBaseUrl: string) {
  try {
    const url = new URL(apiBaseUrl);
    return `${url.hostname}:${url.port || "80"}`;
  } catch {
    return apiBaseUrl.replace(/^https?:\/\//, "");
  }
}

export function AppShell({ children }: PropsWithChildren) {
  const location = useLocation();
  const pageMeta = routeMeta[location.pathname] ?? {
    kicker: "Sara Core",
    title: "Workspace",
    description: "Voice, grounding e tool traces em uma superficie operacional unica."
  };
  const apiBaseUrl = useUiStore((state) => state.apiBaseUrl);
  const [healthState, setHealthState] = useState<{
    status: "loading" | "online" | "offline";
    environment: string | null;
  }>({
    status: "loading",
    environment: null
  });

  useEffect(() => {
    let isActive = true;

    setHealthState((current) => ({
      status: current.status === "online" ? current.status : "loading",
      environment: current.environment
    }));

    void healthApi
      .getStatus()
      .then((response) => {
        if (!isActive) {
          return;
        }

        setHealthState({
          status: "online",
          environment: response.environment
        });
      })
      .catch(() => {
        if (!isActive) {
          return;
        }

        setHealthState({
          status: "offline",
          environment: null
        });
      });

    return () => {
      isActive = false;
    };
  }, [apiBaseUrl]);

  const runtimeTone =
    healthState.status === "online"
      ? "success"
      : healthState.status === "offline"
        ? "error"
        : "warning";

  const runtimeLabel =
    healthState.status === "online"
      ? `Backend online${healthState.environment ? ` • ${healthState.environment}` : ""}`
      : healthState.status === "offline"
        ? "Backend indisponivel"
        : "Verificando runtime";

  return (
    <div className="app-shell">
      <div className="app-shell__ambient" aria-hidden="true" />

      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand__crest">
            <Waveform weight="duotone" />
          </div>
          <div className="sidebar-brand__copy">
            <span>Signal Desk</span>
            <h1>Sara Core</h1>
            <p>Voice, grounding and traceability in one operational surface.</p>
          </div>
        </div>

        <section className="sidebar-runtime">
          <div className="sidebar-runtime__header">
            <div>
              <span className="sidebar-runtime__eyebrow">Runtime pulse</span>
              <h2>{formatRuntimeLabel(apiBaseUrl)}</h2>
            </div>
            <StatusPill tone={runtimeTone}>{runtimeLabel}</StatusPill>
          </div>

          <div className="sidebar-runtime__grid">
            <div className="sidebar-runtime__cell">
              <ShieldCheck weight="duotone" />
              <div>
                <strong>API protegida</strong>
                <span>401 e 429 agora aparecem com mensagens claras no client.</span>
              </div>
            </div>
            <div className="sidebar-runtime__cell">
              <ArrowsClockwise weight="duotone" />
              <div>
                <strong>Voice transacional</strong>
                <span>As escritas persistidas fazem rollback juntas em caso de falha.</span>
              </div>
            </div>
            <div className="sidebar-runtime__cell">
              <Command weight="duotone" />
              <div>
                <strong>Grounded por design</strong>
                <span>A inspecao do prompt continua presa ao contexto armazenado.</span>
              </div>
            </div>
          </div>
        </section>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <SidebarNavItem key={item.to} {...item} />
          ))}
        </nav>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <div className="app-topbar__intro">
            <span className="app-topbar__kicker">{pageMeta.kicker}</span>
            <h2>{pageMeta.title}</h2>
            <p>{pageMeta.description}</p>
          </div>

          <div className="app-topbar__actions">
            <span className="topbar-chip">
              <Pulse weight="duotone" />
              Health publico
            </span>
            <span className="topbar-chip">
              <ShieldCheck weight="duotone" />
              API key pronta
            </span>
            <span className="topbar-chip">
              <Waveform weight="duotone" />
              STT local
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
