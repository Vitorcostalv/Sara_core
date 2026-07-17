export type DemoScenarioId =
  | "amazonia-coerente"
  | "cerrado-predador-presa"
  | "manguezal-incoerente"
  | "invasao-javali-cerrado";

export type PerformanceProfileId = "high" | "balanced" | "light";

export interface DemoScenario {
  id: DemoScenarioId;
  title: string;
  purpose: string;
  prompt: string;
  expectedVisualFocus: string;
  expectedReportFocus: string;
  recommendedPerformanceProfile: PerformanceProfileId;
  kind: "ecosystem" | "invasive";
}

export const PERFORMANCE_PROFILES: Record<
  PerformanceProfileId,
  {
    label: string;
    description: string;
    terrainSize: { width: number; height: number };
    dpr: [number, number];
    agentDisplayCap: number;
    shadows: boolean;
    rainParticles: "full" | "reduced" | "off";
    secondaryEffects: boolean;
  }
> = {
  high: {
    label: "Qualidade alta",
    description: "Mais detalhes visuais para desktop com GPU confortavel.",
    terrainSize: { width: 48, height: 36 },
    dpr: [1, 2],
    agentDisplayCap: 140,
    shadows: true,
    rainParticles: "full",
    secondaryEffects: true,
  },
  balanced: {
    label: "Equilibrado",
    description: "Padrao para notebook e projetor.",
    terrainSize: { width: 32, height: 24 },
    dpr: [1, 1.5],
    agentDisplayCap: 90,
    shadows: true,
    rainParticles: "reduced",
    secondaryEffects: true,
  },
  light: {
    label: "Modo leve",
    description:
      "Reduz resolucao, particulas e sobreposicoes visuais. Nao altera os valores cientificos do backend.",
    terrainSize: { width: 20, height: 16 },
    dpr: [1, 1],
    agentDisplayCap: 45,
    shadows: false,
    rainParticles: "off",
    secondaryEffects: false,
  },
};

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "amazonia-coerente",
    title: "Amazonia coerente",
    purpose: "Mostrar um ecossistema quente, umido e validado sem contradicoes bloqueantes.",
    prompt: "Floresta amazonica densa, quente e muito umida, com rios e fauna nativa coerente.",
    expectedVisualFocus: "Dossel verde, agua doce, fauna terrestre e poucos alertas.",
    expectedReportFocus: "Perfil de ecossistema, validacao alta, base de recursos e rede trofica.",
    recommendedPerformanceProfile: "balanced",
    kind: "ecosystem",
  },
  {
    id: "cerrado-predador-presa",
    title: "Cerrado com predador e presa",
    purpose: "Evidenciar predacao, piramide trofica e suporte de recursos de savana.",
    prompt: "Cerrado brasileiro com graminias, arbustos, herbivoros e um predador nativo.",
    expectedVisualFocus: "Campo aberto, fauna visivel, eventos de caca e fuga.",
    expectedReportFocus: "Rede trofica, fauna, elos ativos e pressao herbivora.",
    recommendedPerformanceProfile: "balanced",
    kind: "ecosystem",
  },
  {
    id: "manguezal-incoerente",
    title: "Manguezal deliberadamente incoerente",
    purpose: "Demonstrar que a validacao deterministica aponta contradicoes.",
    prompt: "Manguezal seco, sem agua salobra, com baixa umidade e fauna terrestre de savana.",
    expectedVisualFocus: "Cena visualmente completa, mas com avisos de incoerencia.",
    expectedReportFocus: "Contradicoes bloqueantes antes dos detalhes positivos.",
    recommendedPerformanceProfile: "light",
    kind: "ecosystem",
  },
  {
    id: "invasao-javali-cerrado",
    title: "Invasao de javali no Cerrado",
    purpose: "Mostrar mecanismos de bioinvasao, recursos afetados e pressao de dispersao.",
    prompt: "Javali invasor no cerrado brasileiro com fauna nativa afetada.",
    expectedVisualFocus: "Invasor destacado sobre terreno de Cerrado.",
    expectedReportFocus: "Sobrepastejo, competicao, recursos afetados e incertezas MVP.",
    recommendedPerformanceProfile: "light",
    kind: "invasive",
  },
];

export function getDemoScenario(id: DemoScenarioId): DemoScenario {
  return DEMO_SCENARIOS.find((scenario) => scenario.id === id) ?? DEMO_SCENARIOS[0]!;
}
