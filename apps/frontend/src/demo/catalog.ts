export type DemoScenarioId =
  | "amazonia-coerente"
  | "cerrado-predador-presa"
  | "manguezal-incoerente"
  | "antartida-cadeia-polar"
  | "oceano-pelagico-tropical"
  | "montanha-nevada-alpina"
  | "invasao-javali-cerrado";

export type PerformanceProfileId = "high" | "balanced" | "light";

export interface DemoScenario {
  id: DemoScenarioId;
  title: string;
  /** Rótulo curto para atalhos em colunas estreitas, onde o título completo quebra. */
  shortTitle: string;
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
    description: "Mais detalhes visuais para desktop com GPU confortável.",
    terrainSize: { width: 48, height: 36 },
    dpr: [1, 2],
    agentDisplayCap: 140,
    shadows: true,
    rainParticles: "full",
    secondaryEffects: true,
  },
  balanced: {
    label: "Equilibrado",
    description: "Padrão para notebook e projetor.",
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
      "Reduz resolução, partículas e sobreposições visuais. Não altera os valores científicos do backend.",
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
    title: "Amazônia coerente",
    shortTitle: "Amazônia",
    purpose: "Mostrar um ecossistema quente, úmido e validado sem contradições bloqueantes.",
    prompt: "Floresta amazônica densa, quente e muito úmida, com rios e fauna nativa coerente.",
    expectedVisualFocus: "Dossel verde, água doce, fauna terrestre e poucos alertas.",
    expectedReportFocus: "Perfil de ecossistema, validação alta, base de recursos e rede trófica.",
    recommendedPerformanceProfile: "balanced",
    kind: "ecosystem",
  },
  {
    id: "cerrado-predador-presa",
    title: "Cerrado com predador e presa",
    shortTitle: "Cerrado",
    purpose: "Evidenciar predação, pirâmide trófica e suporte de recursos de savana.",
    prompt: "Cerrado brasileiro com gramíneas, arbustos, herbívoros e um predador nativo.",
    expectedVisualFocus: "Campo aberto, fauna visível, eventos de caça e fuga.",
    expectedReportFocus: "Rede trófica, fauna, elos ativos e pressão herbívora.",
    recommendedPerformanceProfile: "balanced",
    kind: "ecosystem",
  },
  {
    id: "manguezal-incoerente",
    title: "Manguezal deliberadamente incoerente",
    shortTitle: "Manguezal",
    purpose: "Demonstrar que a validação determinística aponta contradições.",
    prompt: "Manguezal seco, sem água salobra, com baixa umidade e fauna terrestre de savana.",
    expectedVisualFocus: "Cena visualmente completa, mas com avisos de incoerência.",
    expectedReportFocus: "Contradições bloqueantes antes dos detalhes positivos.",
    recommendedPerformanceProfile: "light",
    kind: "ecosystem",
  },
  {
    id: "antartida-cadeia-polar",
    title: "Antártida com cadeia polar",
    shortTitle: "Antártida",
    purpose: "Mostrar um bioma extremo onde a base da cadeia é plâncton, não vegetação.",
    prompt: "Antártida com plataforma de gelo e mar polar, krill, pinguins, foca-leopardo e orca.",
    expectedVisualFocus: "Gelo, mar polar e fauna marinha; nenhuma vegetação terrestre.",
    expectedReportFocus: "Base de recursos sem pastagem, cadeia trófica marinha e restrição climática.",
    recommendedPerformanceProfile: "balanced",
    kind: "ecosystem",
  },
  {
    id: "oceano-pelagico-tropical",
    title: "Oceano pelágico tropical",
    shortTitle: "Oceano",
    purpose: "Evidenciar que a fauna acompanha a temperatura: mar quente não recebe espécie polar.",
    prompt: "Oceano aberto tropical com ilhas, cardumes de sardinha, atum, tartaruga-verde e golfinhos.",
    expectedVisualFocus: "Mar dominante com ilhas vegetadas e cardumes em movimento.",
    expectedReportFocus: "Cobertura de água, salinidade e cadeia pelágica sem fauna antártica.",
    recommendedPerformanceProfile: "balanced",
    kind: "ecosystem",
  },
  {
    id: "montanha-nevada-alpina",
    title: "Montanha nevada com fauna alpina",
    shortTitle: "Montanha",
    purpose: "Mostrar gradiente de altitude e especialistas de montanha com predador de topo.",
    prompt: "Montanha nevada com picos rochosos, encosta de taiga, marmotas, cabras-monteses, águia-real e puma.",
    expectedVisualFocus: "Relevo acentuado, neve no topo e taiga nas encostas baixas.",
    expectedReportFocus: "Cobertura montanhosa, rugosidade e cadeia herbívoro-predador de altitude.",
    recommendedPerformanceProfile: "balanced",
    kind: "ecosystem",
  },
  {
    id: "invasao-javali-cerrado",
    title: "Invasão de javali no Cerrado",
    shortTitle: "Javali",
    purpose: "Mostrar mecanismos de bioinvasão, recursos afetados e pressão de dispersão.",
    prompt: "Javali invasor no cerrado brasileiro com fauna nativa afetada.",
    expectedVisualFocus: "Invasor destacado sobre terreno de Cerrado.",
    expectedReportFocus: "Sobrepastejo, competição, recursos afetados e incertezas MVP.",
    recommendedPerformanceProfile: "light",
    kind: "invasive",
  },
];

export function getDemoScenario(id: DemoScenarioId): DemoScenario {
  return DEMO_SCENARIOS.find((scenario) => scenario.id === id) ?? DEMO_SCENARIOS[0]!;
}
