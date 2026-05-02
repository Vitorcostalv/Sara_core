/**
 * Artificial environment generator — MVP.
 * Generates a structured description of an artificial/restored ecosystem
 * based on project type and target ecosystem reference.
 * Uses data from the artificial_projects and project_target_ecosystems tables (via repository).
 */

import type { ArtificialProjectRow } from "../grounding/ecological-grounding.repository";

export type ArtificialEnvScale = "site" | "watershed" | "local" | "landscape";

export interface ArtificialEnvComponent {
  name: string;
  type: "biotic" | "abiotic" | "structural" | "management";
  description: string;
  isCritical: boolean;
}

export interface ArtificialEnvConstraint {
  constraint: string;
  category: "ecological" | "technical" | "governance";
}

export interface ArtificialEnvResult {
  projectSlug: string;
  projectTitle: string;
  projectType: string;
  ecosystemKind: string;
  objective: string;
  targetEcosystemSlugs: string[];
  scale: ArtificialEnvScale;
  designComponents: ArtificialEnvComponent[];
  constraints: ArtificialEnvConstraint[];
  monitoringRecommendations: string[];
  cautionNotes: string;
  simulationNote: string;
}

// ─── Component templates by project type ─────────────────────────────────────

const COMPONENTS_BY_TYPE: Record<string, ArtificialEnvComponent[]> = {
  "constructed-wetland": [
    { name: "Zona de entrada com sedimentação", type: "structural", description: "Câmara inicial de decantação para remoção de sólidos.", isCritical: true },
    { name: "Zona de macrófitas", type: "biotic", description: "Plantas aquáticas (ex.: Phragmites, Typha) para uptake de nutrientes.", isCritical: true },
    { name: "Substrato de filtragem", type: "abiotic", description: "Cascalho, areia ou biocarvão para retenção de poluentes.", isCritical: true },
    { name: "Zona de polimento", type: "structural", description: "Tratamento final antes da saída.", isCritical: false },
    { name: "Gestão de invasoras", type: "management", description: "Monitoramento de espécies como Phragmites invasora.", isCritical: true },
  ],
  "coral-restoration": [
    { name: "Viveiro de coral", type: "structural", description: "Estrutura submersa para crescimento de fragmentos.", isCritical: true },
    { name: "Seleção genotípica", type: "management", description: "Escolha de genótipos resilientes a estresse térmico.", isCritical: true },
    { name: "Transplante e ancoragem", type: "structural", description: "Fixação de fragmentos no substrato de destino.", isCritical: true },
    { name: "Monitoramento de branqueamento", type: "management", description: "Rastreamento de eventos de branqueamento por anomalias térmicas.", isCritical: true },
  ],
  "artificial-reef": [
    { name: "Substrato estrutural", type: "structural", description: "Módulos de concreto, pedras ou estruturas biocompatíveis.", isCritical: true },
    { name: "Rugosidade e complexidade", type: "abiotic", description: "Heterogeneidade de superfície para abrigo de fauna.", isCritical: true },
    { name: "Monitoramento de colonização", type: "management", description: "Avaliação de cobertura de invertebrados e peixe.", isCritical: false },
  ],
  "agroforestry": [
    { name: "Estrato arbóreo", type: "biotic", description: "Espécies frutíferas, madeireiras e de serviço no dossel.", isCritical: true },
    { name: "Estrato arbustivo e liana", type: "biotic", description: "Diversidade funcional intermediária.", isCritical: false },
    { name: "Cobertura de solo", type: "biotic", description: "Plantas de cobertura para controle de erosão e ciclagem.", isCritical: true },
    { name: "Manejo sucessional", type: "management", description: "Poda, desbaste e introdução de espécies em fases.", isCritical: true },
  ],
  "closed-biosphere": [
    { name: "Câmara de vida", type: "structural", description: "Volume pressurizado com controle atmosférico.", isCritical: true },
    { name: "Módulo vegetal", type: "biotic", description: "Produção primária para O2 e alimento.", isCritical: true },
    { name: "Módulo aquático", type: "biotic", description: "Reciclagem de nutrientes e água via organismos aquáticos.", isCritical: true },
    { name: "Controle atmosférico", type: "abiotic", description: "Sensores e ajuste de CO2, O2 e umidade.", isCritical: true },
    { name: "Banco de dados ecológicos", type: "management", description: "Registro de fluxos materiais para diagnóstico de desequilíbrios.", isCritical: true },
  ],
  "urban-restoration": [
    { name: "Corredores de vegetação nativa", type: "biotic", description: "Conectividade entre fragmentos urbanos.", isCritical: true },
    { name: "Restauração hidrológica", type: "abiotic", description: "Drenagem natural, permeabilidade de solo.", isCritical: true },
    { name: "Controle de invasoras urbanas", type: "management", description: "Manejo de espécies oportunistas de alta pressão urbana.", isCritical: false },
    { name: "Engajamento comunitário", type: "management", description: "Manutenção e monitoramento participativos.", isCritical: false },
  ],
  default: [
    { name: "Estrutura de habitat", type: "structural", description: "Componente estrutural do sistema artificial.", isCritical: true },
    { name: "Componentes bióticos", type: "biotic", description: "Espécies ou comunidades introduzidas.", isCritical: true },
    { name: "Monitoramento", type: "management", description: "Avaliação periódica de indicadores.", isCritical: false },
  ],
};

const MONITORING_BY_TYPE: Record<string, string[]> = {
  "constructed-wetland": [
    "Qualidade da água na entrada e saída (OD, turbidez, nutrientes)",
    "Cobertura e biomassa de macrófitas",
    "Presença de aves e invertebrados aquáticos como indicadores",
    "Colmatação e manutenção do substrato",
  ],
  "coral-restoration": [
    "Taxa de sobrevivência dos fragmentos transplantados",
    "Temperatura e pH da água (branqueamento)",
    "Cobertura de coral vivo e recrutamento natural",
    "Riqueza de peixes recifais associados",
  ],
  "artificial-reef": [
    "Cobertura de invertebrados sésseis",
    "Riqueza e abundância de peixes",
    "Erosão e estabilidade da estrutura",
  ],
  "agroforestry": [
    "Cobertura de dossel por estrato",
    "Riqueza funcional de espécies",
    "Carbono do solo e matéria orgânica",
    "Produção e diversidade de produtos",
  ],
  "closed-biosphere": [
    "Concentrações de O2 e CO2 diárias",
    "Biomassa e produtividade primária",
    "Qualidade e volume de água reciclada",
    "Saúde dos organismos-chave",
  ],
  "urban-restoration": [
    "Conectividade estrutural por índice de fragmentação",
    "Riqueza de aves e insetos polinizadores",
    "Permeabilidade do solo e controle de encharcamento",
    "Uso e satisfação comunitária",
  ],
  default: [
    "Estado das espécies introduzidas",
    "Qualidade do habitat (indicadores físico-químicos)",
    "Presença de espécies invasoras",
  ],
};

// ─── Service ──────────────────────────────────────────────────────────────────

export class ArtificialEnvironmentService {
  generate(project: ArtificialProjectRow, scale: ArtificialEnvScale): ArtificialEnvResult {
    const components = COMPONENTS_BY_TYPE[project.project_type] ?? COMPONENTS_BY_TYPE["default"]!;
    const monitoring = MONITORING_BY_TYPE[project.project_type] ?? MONITORING_BY_TYPE["default"]!;

    const constraints: ArtificialEnvConstraint[] = [];
    if (project.caution_notes) {
      constraints.push({ constraint: project.caution_notes, category: "ecological" });
    }
    if (scale === "site") {
      constraints.push({ constraint: "Escala de sítio: resultados dependem fortemente do entorno e da qualidade do insumo.", category: "ecological" });
    }
    if (scale === "landscape") {
      constraints.push({ constraint: "Escala de paisagem: requer governança integrada entre atores e propriedades.", category: "governance" });
    }
    constraints.push({
      constraint: "Monitoramento de longo prazo essencial: projetos artificiais podem regredir sem manutenção.",
      category: "technical",
    });

    return {
      projectSlug: project.slug,
      projectTitle: project.title,
      projectType: project.project_type,
      ecosystemKind: project.ecosystem_kind,
      objective: project.objective,
      targetEcosystemSlugs: project.target_ecosystem_slugs,
      scale,
      designComponents: components,
      constraints,
      monitoringRecommendations: monitoring,
      cautionNotes: project.caution_notes ?? "Nenhuma nota de cautela específica registrada.",
      simulationNote:
        "MVP artificial environment generator. Components and monitoring recommendations are " +
        "representative templates, not a validated design specification. " +
        "Real project design requires site assessment, species selection, and engineering analysis.",
    };
  }
}

export const artificialEnvironmentService = new ArtificialEnvironmentService();
