export interface EcologicalForecastInput {
  speciesIds: string[];
  unit: "individuals" | "individuals-per-km2";
  source: { name: string; samplingProtocol: string; comparableSampling: true; kind: "field" | "synthetic" };
  observations: { date: string; populations: Record<string, number> }[];
  horizonDays: number;
}

export interface ForecastPoint {
  date: string;
  estimate: number;
  lower: number;
  upper: number;
}

export interface EcologicalForecastResult {
  modelVersion: "observational-log-trend-v1";
  datasetSha256: string;
  status: "experimental" | "insufficient-evidence";
  unit: EcologicalForecastInput["unit"];
  source: EcologicalForecastInput["source"];
  observationCount: number;
  historyDays: number;
  horizonDays: number;
  intervalKind: "conditional-model-95-percent";
  causalPredationEffectsEstimated: false;
  species: {
    id: string;
    commonName: string;
    netLogGrowthPerDay: number;
    validation: {
      trainingCount: number;
      holdoutCount: number;
      modelMae: number;
      persistenceMae: number;
      beatsPersistence: boolean;
      observedIntervalCoverage: number;
    };
    forecast: ForecastPoint[];
  }[];
  warnings: string[];
}
