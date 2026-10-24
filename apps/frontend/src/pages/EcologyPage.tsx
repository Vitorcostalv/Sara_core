import { useMemo, useState } from "react";
import {
  ArrowRight,
  Bug,
  CaretDown,
  CaretUp,
  Leaf,
  Mountains,
  Plant,
  Stack,
  Thermometer,
} from "@phosphor-icons/react";
import { Button, PageHeader } from "../components/ui";
import { DEMO_SCENARIOS } from "../demo/catalog";
import { EcologyCatalogSection } from "../features/ecology/EcologyCatalogSection";
import { EcologyInvasiveSection } from "../features/ecology/EcologyInvasiveSection";
import { EcologyQuerySection } from "../features/ecology/EcologyQuerySection";
import { EcologyScenarioSection } from "../features/ecology/EcologyScenarioSection";
import { EcologySuccessionSection } from "../features/ecology/EcologySuccessionSection";
import { EcologyTerrainSection } from "../features/ecology/EcologyTerrainSection";
import { useUiStore } from "../state/ui.store";

type EcologyTab = "consulta" | "catalogo" | "terreno" | "cenario" | "evolucao" | "invasora";

interface TabDef {
  id: EcologyTab;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  group: "primary" | "secondary";
}

const TABS: TabDef[] = [
  {
    id: "terreno",
    label: "Simular ambiente",
    subtitle: "Terreno & fauna 3D",
    icon: <Mountains weight="duotone" />,
    group: "primary",
  },
  {
    id: "invasora",
    label: "Bioinvasão",
    subtitle: "Espécie invasora",
    icon: <Bug weight="duotone" />,
    group: "primary",
  },
  {
    id: "consulta",
    label: "Perguntar",
    subtitle: "Consulta científica",
    icon: <Leaf weight="duotone" />,
    group: "secondary",
  },
  {
    id: "catalogo",
    label: "Dados",
    subtitle: "Catálogo do domínio",
    icon: <Stack weight="duotone" />,
    group: "secondary",
  },
  {
    id: "cenario",
    label: "Risco climático",
    subtitle: "Cenário",
    icon: <Thermometer weight="duotone" />,
    group: "secondary",
  },
  {
    id: "evolucao",
    label: "Sucessão",
    subtitle: "Evolução do ecossistema",
    icon: <Plant weight="duotone" />,
    group: "secondary",
  },
];

const DEMO_FLOW = [
  "Descreva o ecossistema",
  "Gere a simulação",
  "Inspecione terreno e fauna",
  "Leia a validação determinística",
  "Teste uma espécie invasora",
];

export function EcologyPage() {
  const [activeTab, setActiveTab] = useState<EcologyTab>("terreno");
  const [terrainPromptRequest, setTerrainPromptRequest] = useState<string | null>(null);
  const [selectedOfflineScenario, setSelectedOfflineScenario] = useState<string | null>(null);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [scenariosOpen, setScenariosOpen] = useState(false);
  const presentationMode = useUiStore((state) => state.presentationMode);
  const demoFlowDismissed = useUiStore((state) => state.demoFlowDismissed);
  const setDemoFlowDismissed = useUiStore((state) => state.setDemoFlowDismissed);

  const activeTabDef = useMemo(() => TABS.find((tab) => tab.id === activeTab) ?? TABS[0]!, [activeTab]);
  const showFlow = presentationMode || !demoFlowDismissed;

  const handleGenerateEcosystem = (prompt: string) => {
    setTerrainPromptRequest(prompt);
    setActiveTab("terreno");
  };

  const handleScenarioClick = (scenarioId: string, prompt: string, kind: "ecosystem" | "invasive") => {
    if (kind === "invasive") {
      setActiveTab("invasora");
      setSelectedOfflineScenario(scenarioId);
      return;
    }
    setTerrainPromptRequest(prompt);
    setSelectedOfflineScenario(scenarioId);
    setActiveTab("terreno");
  };

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Observatório ecológico"
        title="Ecossistemas sintéticos"
        description="A IA interpreta a descrição; o backend valida clima, recursos, fauna e rede trófica de forma determinística."
        icon={<Leaf weight="duotone" />}
      />

      <div className={`presentation-scenarios${scenariosOpen ? " is-open" : ""}`}>
      <button type="button" className="presentation-scenarios__toggle" aria-expanded={scenariosOpen} onClick={() => setScenariosOpen(!scenariosOpen)}>
        Cenários prontos <span aria-hidden="true">{scenariosOpen ? "−" : "+"}</span>
      </button>
      <div className="presentation-actions">
        {DEMO_SCENARIOS.map((scenario) => (
          <Button
            key={scenario.id}
            variant={scenario.kind === "invasive" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => handleScenarioClick(scenario.id, scenario.prompt, scenario.kind)}
            title={`${scenario.purpose} Foco: ${scenario.expectedReportFocus}`}
          >
            {scenario.title}
          </Button>
        ))}
      </div>

      </div>

      {showFlow ? (
        <section className="demo-flow-card">
          <div className="demo-flow-card__header">
            <strong>Roteiro de demonstração</strong>
            {!presentationMode ? (
              <Button variant="ghost" size="sm" onClick={() => setDemoFlowDismissed(true)}>
                Ocultar
              </Button>
            ) : null}
          </div>
          <ol className="demo-flow" aria-label="Fluxo de demonstração">
            {DEMO_FLOW.map((step, index) => (
              <li key={step} className="demo-flow__step">
                <b>{String.fromCharCode(65 + index)}</b>
                {step}
                {index < DEMO_FLOW.length - 1 ? (
                  <ArrowRight className="demo-flow__arrow" weight="bold" aria-hidden="true" />
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => setDemoFlowDismissed(false)}>
          Mostrar roteiro de demonstração
        </Button>
      )}

      <nav className="ecology-nav" aria-label="Seções de ecologia">
        <div className="ecology-tabs ecology-tabs--primary">
          {TABS.filter((tab) => tab.group === "primary").map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`ecology-tab-btn${activeTab === tab.id ? " is-active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
              aria-current={activeTab === tab.id ? "page" : undefined}
            >
              {tab.icon}
              <span className="ecology-tab-btn__label"><span className="desktop-action-label">{tab.label}</span><span className="mobile-action-label">{tab.id === "terreno" ? "Ambiente" : tab.label}</span></span>
              <span className="ecology-tab-btn__sub">{tab.subtitle}</span>
            </button>
          ))}
          <button
            type="button"
            className={`ecology-tab-btn ecology-tab-btn--explore${activeTabDef.group === "secondary" ? " is-active" : ""}`}
            onClick={() => setExploreOpen((value) => !value)}
            aria-expanded={exploreOpen}
          >
            {activeTabDef.group === "secondary" ? activeTabDef.icon : <Stack weight="duotone" />}
            <span className="ecology-tab-btn__label">
              Explorar{activeTabDef.group === "secondary" ? `: ${activeTabDef.label}` : ""}
            </span>
            {exploreOpen ? <CaretUp weight="bold" /> : <CaretDown weight="bold" />}
          </button>
        </div>
        {exploreOpen ? (
          <div className="ecology-tabs ecology-tabs--secondary">
            {TABS.filter((tab) => tab.group === "secondary").map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`ecology-tab-btn${activeTab === tab.id ? " is-active" : ""}`}
                onClick={() => {
                  setActiveTab(tab.id);
                  setExploreOpen(false);
                }}
                aria-current={activeTab === tab.id ? "page" : undefined}
              >
                {tab.icon}
                <span className="ecology-tab-btn__label"><span className="desktop-action-label">{tab.label}</span><span className="mobile-action-label">{tab.id === "terreno" ? "Ambiente" : tab.label}</span></span>
                <span className="ecology-tab-btn__sub">{tab.subtitle}</span>
              </button>
            ))}
          </div>
        ) : null}
      </nav>

      {activeTab === "consulta" && (
        <EcologyQuerySection onGenerateEcosystem={handleGenerateEcosystem} />
      )}
      {activeTab === "catalogo" && <EcologyCatalogSection />}
      {activeTab === "terreno" && (
        <EcologyTerrainSection
          initialPrompt={terrainPromptRequest}
          initialOfflineScenarioId={selectedOfflineScenario}
          onInitialPromptConsumed={() => {
            setTerrainPromptRequest(null);
            setSelectedOfflineScenario(null);
          }}
        />
      )}
      {activeTab === "cenario" && <EcologyScenarioSection />}
      {activeTab === "evolucao" && <EcologySuccessionSection />}
      {activeTab === "invasora" && <EcologyInvasiveSection initialOfflineScenarioId={selectedOfflineScenario} />}
    </div>
  );
}
