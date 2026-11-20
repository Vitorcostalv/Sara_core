export type EcosystemActionKind = "decline" | "food-limited" | "predator-control" | "predation-pressure" | "resource-pressure" | "bounded-growth" | "no-change";

export interface EcosystemAction {
  id: string;
  kind: EcosystemActionKind;
  targetSpeciesId: string;
  reason: string;
}

export interface PredationSnapshot {
  tSeconds: number;
  populations: Record<string, number>;
  /** Counterfactual run with exactly the same natives and resources, without introduction. */
  controlPopulations: Record<string, number>;
  resources: Record<string, number>;
  controlResources: Record<string, number>;
}

export interface PredationProjection {
  modelVersion: "food-web-v1";
  outcome: "failed-establishment" | "food-limited" | "regulated" | "prey-decline" | "limited-change";
  invaderId: string;
  network: { predatorId: string; preyId: string }[];
  regulators: string[];
  implicitFoodSpecies: string[];
  snapshots: PredationSnapshot[];
  actions: EcosystemAction[];
  warnings: string[];
}

export interface PredationReasoning {
  source: "rules" | "llm";
  summary: string;
  actionIds: string[];
  warnings: string[];
}
