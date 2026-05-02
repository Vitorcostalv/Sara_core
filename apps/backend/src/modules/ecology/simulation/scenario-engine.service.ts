/**
 * Scenario engine — applies environmental changes to an ecosystem baseline
 * and evaluates ecological risk.
 * SIMPLIFICATION: risk thresholds and impact rules are heuristic.
 * Not a validated climate impact model.
 */

export type DisturbanceType = "none" | "fire" | "flood" | "drought" | "anthropic" | "disease";
export type RiskLevel = "low" | "moderate" | "high" | "critical";

export interface ScenarioState {
  temperatureC: number;
  precipitationMmYear: number;
  humidityPct: number;
  biomeSuggestion: string;
  riskLevel: RiskLevel;
  riskFactors: string[];
}

export interface ScenarioChange {
  parameter: string;
  before: number | string;
  after: number | string;
  delta: string;
}

export interface ScenarioResult {
  ecosystemSlug: string;
  baseline: ScenarioState;
  modified: ScenarioState;
  appliedChanges: ScenarioChange[];
  riskFlags: string[];
  connectivityImpact: string;
  disturbanceImpact: string | null;
  simulationNote: string;
}

export interface ScenarioInput {
  ecosystemSlug: string;
  baseTemperatureC: number;
  basePrecipitationMmYear: number;
  deltaTemperatureC: number;
  deltaPrecipitationPct: number;
  disturbanceType: DisturbanceType;
  disturbanceIntensity: number;  // 0–1
  connectivityIndex: number;     // 0–1
}

// ─── Ecosystem-specific thresholds ───────────────────────────────────────────

interface EcosystemThreshold {
  maxTempIncrease: number;
  criticalMinPrecipPct: number;
  fireRisk: boolean;
  droughtRisk: boolean;
  floodRisk: boolean;
  temperatureSensitivity: "low" | "moderate" | "high" | "critical";
}

const ECOSYSTEM_THRESHOLDS: Record<string, EcosystemThreshold> = {
  "recife-de-coral": {
    maxTempIncrease: 1, criticalMinPrecipPct: 0, fireRisk: false,
    droughtRisk: false, floodRisk: false, temperatureSensitivity: "critical",
  },
  tundra: {
    maxTempIncrease: 2, criticalMinPrecipPct: 0, fireRisk: false,
    droughtRisk: false, floodRisk: false, temperatureSensitivity: "critical",
  },
  pantanal: {
    maxTempIncrease: 3, criticalMinPrecipPct: 30, fireRisk: false,
    droughtRisk: true, floodRisk: false, temperatureSensitivity: "high",
  },
  manguezal: {
    maxTempIncrease: 3, criticalMinPrecipPct: 0, fireRisk: false,
    droughtRisk: false, floodRisk: false, temperatureSensitivity: "high",
  },
  cerrado: {
    maxTempIncrease: 3, criticalMinPrecipPct: 25, fireRisk: true,
    droughtRisk: true, floodRisk: false, temperatureSensitivity: "moderate",
  },
  caatinga: {
    maxTempIncrease: 4, criticalMinPrecipPct: 20, fireRisk: false,
    droughtRisk: true, floodRisk: false, temperatureSensitivity: "moderate",
  },
  taiga: {
    maxTempIncrease: 3, criticalMinPrecipPct: 10, fireRisk: true,
    droughtRisk: false, floodRisk: false, temperatureSensitivity: "high",
  },
};

const DEFAULT_THRESHOLD: EcosystemThreshold = {
  maxTempIncrease: 4, criticalMinPrecipPct: 20, fireRisk: true,
  droughtRisk: true, floodRisk: true, temperatureSensitivity: "moderate",
};

// ─── Biome suggestion from temperature + precipitation ────────────────────────

function guessBiome(tempC: number, precipMm: number): string {
  if (tempC < 0) return "tundra";
  if (tempC < 8 && precipMm > 400) return "taiga";
  if (precipMm < 200) return tempC > 20 ? "deserto-quente" : "deserto-frio";
  if (precipMm < 600 && tempC > 18) return "caatinga";
  if (precipMm < 900 && tempC > 18) return "savana-tropical";
  if (tempC > 22 && precipMm > 2000) return "floresta-tropical-umida";
  if (tempC > 18 && precipMm > 1200) return "floresta-tropical-seca";
  return "pradaria-estepe";
}

// ─── Risk computation ─────────────────────────────────────────────────────────

function computeRisk(
  modifiedTempC: number,
  baseTemp: number,
  modifiedPrecip: number,
  basePercip: number,
  disturbanceType: DisturbanceType,
  disturbanceIntensity: number,
  connectivity: number,
  threshold: EcosystemThreshold
): { riskLevel: RiskLevel; riskFactors: string[] } {
  const riskFactors: string[] = [];
  let riskScore = 0;

  const deltaT = modifiedTempC - baseTemp;
  if (deltaT > threshold.maxTempIncrease) {
    riskScore += (deltaT - threshold.maxTempIncrease) * (threshold.temperatureSensitivity === "critical" ? 3 : 2);
    riskFactors.push(`Aumento de ${deltaT.toFixed(1)}°C excede limiar de ${threshold.maxTempIncrease}°C para este ecossistema.`);
  }

  const precipChangePct = ((modifiedPrecip - basePercip) / (basePercip || 1)) * 100;
  if (precipChangePct < -threshold.criticalMinPrecipPct && threshold.criticalMinPrecipPct > 0) {
    riskScore += 2;
    riskFactors.push(`Redução de ${Math.abs(precipChangePct).toFixed(0)}% na precipitação abaixo do limiar crítico.`);
  }

  if (disturbanceType !== "none" && disturbanceIntensity > 0) {
    const distRisk = disturbanceIntensity * 3;
    riskScore += distRisk;
    riskFactors.push(`Distúrbio tipo '${disturbanceType}' com intensidade ${Math.round(disturbanceIntensity * 100)}%.`);
    if (disturbanceType === "fire" && threshold.fireRisk) {
      riskFactors.push("Ecossistema tem risco específico de fogo.");
    }
    if (disturbanceType === "drought" && threshold.droughtRisk) {
      riskFactors.push("Ecossistema tem vulnerabilidade específica à seca.");
    }
  }

  if (connectivity < 0.4) {
    riskScore += 1;
    riskFactors.push(`Baixa conectividade (${Math.round(connectivity * 100)}%) limita dispersão e recuperação.`);
  }

  if (riskScore >= 5) return { riskLevel: "critical", riskFactors };
  if (riskScore >= 3) return { riskLevel: "high", riskFactors };
  if (riskScore >= 1.5) return { riskLevel: "moderate", riskFactors };
  return { riskLevel: "low", riskFactors };
}

// ─── Service ──────────────────────────────────────────────────────────────────

function baseHumidity(precip: number): number {
  return Math.min(95, Math.max(5, (precip / 4000) * 100 + 20));
}

export class ScenarioEngineService {
  simulate(input: ScenarioInput): ScenarioResult {
    const threshold = ECOSYSTEM_THRESHOLDS[input.ecosystemSlug] ?? DEFAULT_THRESHOLD;

    const baseHumPct = baseHumidity(input.basePrecipitationMmYear);
    const baselineBiome = guessBiome(input.baseTemperatureC, input.basePrecipitationMmYear);

    const baselineRisk = computeRisk(
      input.baseTemperatureC, input.baseTemperatureC,
      input.basePrecipitationMmYear, input.basePrecipitationMmYear,
      "none", 0, input.connectivityIndex, threshold
    );

    const baseline: ScenarioState = {
      temperatureC: input.baseTemperatureC,
      precipitationMmYear: input.basePrecipitationMmYear,
      humidityPct: baseHumPct,
      biomeSuggestion: baselineBiome,
      riskLevel: baselineRisk.riskLevel,
      riskFactors: baselineRisk.riskFactors,
    };

    // Apply deltas
    const modifiedTemp = input.baseTemperatureC + input.deltaTemperatureC;
    const precipFactor = 1 + input.deltaPrecipitationPct / 100;
    const modifiedPrecip = Math.max(0, input.basePrecipitationMmYear * precipFactor);
    const modifiedHum = Math.min(95, Math.max(5, baseHumidity(modifiedPrecip) + input.deltaTemperatureC * -0.5));
    const modifiedBiome = guessBiome(modifiedTemp, modifiedPrecip);

    const modifiedRisk = computeRisk(
      modifiedTemp, input.baseTemperatureC,
      modifiedPrecip, input.basePrecipitationMmYear,
      input.disturbanceType, input.disturbanceIntensity,
      input.connectivityIndex, threshold
    );

    const modified: ScenarioState = {
      temperatureC: Math.round(modifiedTemp * 10) / 10,
      precipitationMmYear: Math.round(modifiedPrecip),
      humidityPct: Math.round(modifiedHum * 10) / 10,
      biomeSuggestion: modifiedBiome,
      riskLevel: modifiedRisk.riskLevel,
      riskFactors: modifiedRisk.riskFactors,
    };

    const changes: ScenarioChange[] = [];
    if (input.deltaTemperatureC !== 0) {
      changes.push({
        parameter: "temperature",
        before: input.baseTemperatureC,
        after: modifiedTemp,
        delta: `${input.deltaTemperatureC > 0 ? "+" : ""}${input.deltaTemperatureC}°C`,
      });
    }
    if (input.deltaPrecipitationPct !== 0) {
      changes.push({
        parameter: "precipitation",
        before: input.basePrecipitationMmYear,
        after: Math.round(modifiedPrecip),
        delta: `${input.deltaPrecipitationPct > 0 ? "+" : ""}${input.deltaPrecipitationPct}%`,
      });
    }
    if (input.disturbanceType !== "none") {
      changes.push({
        parameter: "disturbance",
        before: "none",
        after: input.disturbanceType,
        delta: `intensity ${Math.round(input.disturbanceIntensity * 100)}%`,
      });
    }

    const connectivityImpact =
      input.connectivityIndex < 0.4
        ? "Conectividade baixa — recuperação pós-distúrbio será mais lenta e espécies dispersoras limitadas."
        : input.connectivityIndex < 0.7
        ? "Conectividade moderada — alguma limitação de dispersão e colonização."
        : "Conectividade adequada para dinâmica de metapopulação e recolonização.";

    const disturbanceImpact =
      input.disturbanceType !== "none"
        ? `Distúrbio '${input.disturbanceType}' com intensidade ${Math.round(input.disturbanceIntensity * 100)}% aplicado. Risco de perda de estágio sucessional.`
        : null;

    return {
      ecosystemSlug: input.ecosystemSlug,
      baseline,
      modified,
      appliedChanges: changes,
      riskFlags: modifiedRisk.riskFactors,
      connectivityImpact,
      disturbanceImpact,
      simulationNote:
        "MVP scenario engine. Risk thresholds are heuristic and ecosystem-specific but not validated " +
        "against full climate impact models. Use for qualitative exploration only.",
    };
  }
}

export const scenarioEngineService = new ScenarioEngineService();
