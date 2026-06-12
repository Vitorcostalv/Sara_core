import { useState } from "react";
import { Leaf, Mountains, Stack, Thermometer } from "@phosphor-icons/react";
import { PageHeader } from "../components/ui";
import { EcologyCatalogSection } from "../features/ecology/EcologyCatalogSection";
import { EcologyQuerySection } from "../features/ecology/EcologyQuerySection";
import { EcologyScenarioSection } from "../features/ecology/EcologyScenarioSection";
import { EcologyTerrainSection } from "../features/ecology/EcologyTerrainSection";

// ─── Tab definitions ──────────────────────────────────────────────────────────

type EcologyTab = "consulta" | "catalogo" | "terreno" | "cenario";

interface TabDef {
  id: EcologyTab;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
}

const TABS: TabDef[] = [
  {
    id: "consulta",
    label: "Consulta",
    subtitle: "Resposta grounded",
    icon: <Leaf weight="duotone" />,
  },
  {
    id: "catalogo",
    label: "Catálogo",
    subtitle: "Dados do domínio",
    icon: <Stack weight="duotone" />,
  },
  {
    id: "terreno",
    label: "Terreno",
    subtitle: "Simulação 2D",
    icon: <Mountains weight="duotone" />,
  },
  {
    id: "cenario",
    label: "Cenário",
    subtitle: "Risco climático",
    icon: <Thermometer weight="duotone" />,
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export function EcologyPage() {
  const [activeTab, setActiveTab] = useState<EcologyTab>("consulta");
  // Prompt encaminhado da Consulta para a aba Terreno gerar o ecossistema em 3D.
  const [terrainPromptRequest, setTerrainPromptRequest] = useState<string | null>(null);

  const handleGenerateEcosystem = (prompt: string) => {
    setTerrainPromptRequest(prompt);
    setActiveTab("terreno");
  };

  return (
    <div className="page-stack">
      <PageHeader
        title="Ecologia"
        description="Consulte dados ecológicos grounded, navegue pelo catálogo e explore simulações de terreno e cenários climáticos."
        icon={<Leaf weight="duotone" />}
      />

      {/* Tab navigation */}
      <nav className="ecology-tabs" aria-label="Seções de ecologia">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`ecology-tab-btn${activeTab === tab.id ? " is-active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
            aria-current={activeTab === tab.id ? "page" : undefined}
          >
            {tab.icon}
            <span className="ecology-tab-btn__label">{tab.label}</span>
            <span className="ecology-tab-btn__sub">{tab.subtitle}</span>
          </button>
        ))}
      </nav>

      {/* Tab content — unmount inactive tabs to keep state clean */}
      {activeTab === "consulta" && (
        <EcologyQuerySection onGenerateEcosystem={handleGenerateEcosystem} />
      )}
      {activeTab === "catalogo" && <EcologyCatalogSection />}
      {activeTab === "terreno" && (
        <EcologyTerrainSection
          initialPrompt={terrainPromptRequest}
          onInitialPromptConsumed={() => setTerrainPromptRequest(null)}
        />
      )}
      {activeTab === "cenario" && <EcologyScenarioSection />}
    </div>
  );
}
