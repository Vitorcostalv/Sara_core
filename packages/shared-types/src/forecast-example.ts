import type { EcologicalForecastInput } from "./forecast";

/** Explicitly synthetic fixture shared by UI, integration checks and test tooling. */
export function syntheticForecastExample(): EcologicalForecastInput {
  return {
    speciesIds: ["capivara"], unit: "individuals-per-km2", horizonDays: 14,
    source: { kind: "synthetic", name: "Exemplo sintético Sara Core",
      samplingProtocol: "Série matemática demonstrativa; não contém observações de campo.", comparableSampling: true },
    observations: Array.from({ length: 16 }, (_, i) => ({
      date: new Date(Date.UTC(2025, 0, 1 + i * 7)).toISOString(),
      populations: { capivara: Math.round((Math.exp(Math.log1p(12) + 0.005 * i * 7) - 1) * 1e4) / 1e4 },
    })),
  };
}
