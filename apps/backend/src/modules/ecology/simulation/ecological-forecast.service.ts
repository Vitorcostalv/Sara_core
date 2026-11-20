import { createHash } from "node:crypto";
import type { EcologicalForecastInput, EcologicalForecastResult, ForecastPoint } from "@sara/shared-types";
import { AppError } from "../../../core/errors/app-error";
import { ecologicalForecastSchema } from "../ecology.schemas";
import { getCatalogSpecies } from "./fauna-definition.service";

const DAY = 86_400_000;
const round = (n: number) => Math.round(n * 1e6) / 1e6;

// Two-sided Student-t critical values. Conditional prediction interval assumes
// independent Gaussian errors on log1p abundance; ecological coverage is unvalidated.
function critical95(df: number): number {
  const values = [0, 12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228,
    2.201, 2.179, 2.16, 2.145, 2.131, 2.12, 2.11, 2.101, 2.093, 2.086, 2.08, 2.074, 2.069, 2.064,
    2.06, 2.056, 2.052, 2.048, 2.045, 2.042];
  return values[Math.min(df, 30)]!; // conservative for df > 30
}

function fit(x: number[], observed: number[]) {
  const y = observed.map(Math.log1p);
  const n = x.length;
  const xMean = x.reduce((a, b) => a + b, 0) / n;
  const yMean = y.reduce((a, b) => a + b, 0) / n;
  const sxx = x.reduce((sum, value) => sum + (value - xMean) ** 2, 0);
  const slope = x.reduce((sum, value, i) => sum + (value - xMean) * (y[i]! - yMean), 0) / sxx;
  const intercept = yMean - slope * xMean;
  const variance = y.reduce((sum, value, i) => sum + (value - (intercept + slope * x[i]!)) ** 2, 0) / (n - 2);
  let bounded = false;
  const abundance = (logValue: number) => {
    if (logValue > Math.log1p(1e9)) bounded = true;
    return round(Math.max(0, Math.expm1(Math.min(Math.log1p(1e9), logValue))));
  };
  const predict = (day: number) => {
    const logEstimate = intercept + slope * day;
    const margin = critical95(n - 2) * Math.sqrt(variance * (1 + 1 / n + (day - xMean) ** 2 / sxx));
    return { estimate: abundance(logEstimate), lower: abundance(logEstimate - margin), upper: abundance(logEstimate + margin) };
  };
  return { slope, predict, bounded: () => bounded };
}

export function forecastEcology(rawInput: EcologicalForecastInput): EcologicalForecastResult {
  const input = ecologicalForecastSchema.parse(rawInput);
  const origin = Date.parse(input.observations[0]!.date);
  const x = input.observations.map((o) => (Date.parse(o.date) - origin) / DAY);
  const historyDays = x.at(-1)!;
  const holdoutCount = Math.max(3, Math.floor(input.observations.length * 0.25));
  const trainingCount = input.observations.length - holdoutCount;
  const warnings = [
    "Previsão experimental de abundância observada; não estima efeitos causais de introduzir ou remover predadores.",
    "Intervalos condicionais de 95% dependem das hipóteses do modelo e não incluem toda a incerteza ecológica.",
    "Origem e comparabilidade das observações são declaradas pelo usuário, não verificadas automaticamente.",
  ];
  const species = input.speciesIds.map((id) => {
    const catalog = getCatalogSpecies(id);
    if (!catalog) throw new AppError("FORECAST_SPECIES_UNKNOWN", 422, `Espécie não catalogada: ${id}`);
    const y = input.observations.map((o) => o.populations[id]!);
    // Holdout is never used to fit or select the evaluated model.
    const evaluation = fit(x.slice(0, trainingCount), y.slice(0, trainingCount));
    const predictions = x.slice(trainingCount).map((day) => evaluation.predict(day));
    const actual = y.slice(trainingCount);
    const modelMae = actual.reduce((sum, value, i) => sum + Math.abs(value - predictions[i]!.estimate), 0) / holdoutCount;
    const persistenceMae = actual.reduce((sum, value) => sum + Math.abs(value - y[trainingCount - 1]!), 0) / holdoutCount;
    const beatsPersistence = modelMae + 1e-6 < persistenceMae;
    const coverage = actual.filter((value, i) => value >= predictions[i]!.lower - 1e-6 && value <= predictions[i]!.upper + 1e-6).length / holdoutCount;
    // Once evaluated, refit on all supplied observations for the next forecast.
    const calibrated = fit(x, y);
    const forecast: ForecastPoint[] = Array.from({ length: input.horizonDays }, (_, index) => ({
      date: new Date(origin + (historyDays + index + 1) * DAY).toISOString(),
      ...calibrated.predict(historyDays + index + 1),
    }));
    if (!beatsPersistence) warnings.push(`${catalog.commonName}: o modelo não superou manter a última observação no período de teste.`);
    if (evaluation.bounded() || calibrated.bounded()) warnings.push(`${catalog.commonName}: extrapolação atingiu limite numérico; resultado não deve ser usado como previsão confiável.`);
    return { id, commonName: catalog.commonName, netLogGrowthPerDay: round(calibrated.slope),
      validation: { trainingCount, holdoutCount, modelMae: round(modelMae), persistenceMae: round(persistenceMae), beatsPersistence, observedIntervalCoverage: round(coverage) }, forecast };
  });
  if (input.source.kind === "synthetic") warnings.push("Dados sintéticos demonstram o fluxo; não validam precisão em um ecossistema real.");
  return {
    modelVersion: "observational-log-trend-v1",
    datasetSha256: createHash("sha256").update(JSON.stringify(input)).digest("hex"),
    status: input.source.kind === "field" && species.every((s) => s.validation.beatsPersistence) && !warnings.some((w) => w.includes("limite numérico")) ? "experimental" : "insufficient-evidence",
    unit: input.unit, source: input.source, observationCount: input.observations.length,
    historyDays, horizonDays: input.horizonDays, intervalKind: "conditional-model-95-percent",
    causalPredationEffectsEstimated: false, species, warnings,
  };
}
