import { useState } from "react";
import { ArrowRight, Thermometer, WarningCircle } from "@phosphor-icons/react";
import { Button, EmptyState, ErrorState, LoadingBlock, StatusPill } from "../../components/ui";
import { getApiErrorMessage } from "../../services/api/client";
import { ecologyApi } from "../../services/api/ecology";
import type { RiskLevel, ScenarioResult, ScenarioState } from "../../services/api/ecology";

// ─── Risk gauge ───────────────────────────────────────────────────────────────

const RISK_META: Record<
  RiskLevel,
  { label: string; tone: "success" | "warning" | "error"; pct: number; color: string }
> = {
  low: { label: "Baixo", tone: "success", pct: 20, color: "#49d89f" },
  moderate: { label: "Moderado", tone: "warning", pct: 50, color: "#ffb347" },
  high: { label: "Alto", tone: "error", pct: 75, color: "#ff9a3c" },
  critical: { label: "Crítico", tone: "error", pct: 100, color: "#ff7b6b" },
};

function RiskGauge({ level }: { level: RiskLevel }) {
  const meta = RISK_META[level];
  return (
    <div className="risk-gauge">
      <div className="risk-gauge__labels">
        <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
        <span className="risk-gauge__scale">
          baixo · moderado · alto · crítico
        </span>
      </div>
      <div className="risk-gauge__bar">
        <div
          className="risk-gauge__fill"
          style={{ width: `${meta.pct}%`, backgroundColor: meta.color }}
        />
      </div>
    </div>
  );
}

// ─── Scenario state card ──────────────────────────────────────────────────────

function ScenarioStateCard({
  state,
  label,
  isModified,
}: {
  state: ScenarioState;
  label: string;
  isModified?: boolean;
}) {
  return (
    <div className={`scenario-state-card${isModified ? " scenario-state-card--modified" : ""}`}>
      <p className="scenario-state-card__title">{label}</p>

      <div className="scenario-metric">
        <span className="scenario-metric__label">Temperatura</span>
        <span className="scenario-metric__value">{state.temperatureC}°C</span>
      </div>

      <div className="scenario-metric">
        <span className="scenario-metric__label">Precipitação</span>
        <span className="scenario-metric__value">{state.precipitationMmYear} mm/a</span>
      </div>

      <div className="scenario-metric">
        <span className="scenario-metric__label">Umidade</span>
        <span className="scenario-metric__value">{state.humidityPct}%</span>
      </div>

      <div className="scenario-metric">
        <span className="scenario-metric__label">Bioma estimado</span>
        <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>{state.biomeSuggestion}</span>
      </div>

      <RiskGauge level={state.riskLevel} />

      {state.riskFactors.length > 0 ? (
        <div className="stack-sm" style={{ marginTop: "0.25rem" }}>
          {state.riskFactors.map((f) => (
            <div key={f} className="signal-message signal-message--warning" style={{ padding: "0.65rem 0.8rem" }}>
              <WarningCircle weight="duotone" />
              <div>
                <span>{f}</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ─── Scenario section ─────────────────────────────────────────────────────────

interface ScenarioForm {
  ecosystemSlug: string;
  baseTemperatureC: string;
  basePrecipitationMmYear: string;
  deltaTemperatureC: string;
  deltaPrecipitationPct: string;
  disturbanceType: string;
  disturbanceIntensity: string;
  connectivityIndex: string;
}

const INITIAL_FORM: ScenarioForm = {
  ecosystemSlug: "cerrado",
  baseTemperatureC: "24",
  basePrecipitationMmYear: "1200",
  deltaTemperatureC: "2",
  deltaPrecipitationPct: "-20",
  disturbanceType: "drought",
  disturbanceIntensity: "0.4",
  connectivityIndex: "0.6",
};

const SUGGESTED_ECOSYSTEMS = [
  "cerrado",
  "caatinga",
  "pantanal",
  "manguezal",
  "tundra",
  "recife-de-coral",
  "mata-atlantica",
];

const DISTURBANCE_OPTIONS = [
  { value: "none", label: "Nenhum" },
  { value: "fire", label: "Incêndio" },
  { value: "flood", label: "Enchente" },
  { value: "drought", label: "Seca" },
  { value: "anthropic", label: "Antrópico" },
  { value: "disease", label: "Doença" },
];

export function EcologyScenarioSection() {
  const [form, setForm] = useState<ScenarioForm>(INITIAL_FORM);
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = (key: keyof ScenarioForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const num = (v: string, fallback: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  const simulate = async () => {
    if (!form.ecosystemSlug.trim()) {
      setError("Informe um ecossistema para simular.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await ecologyApi.simulateScenario({
        ecosystemSlug: form.ecosystemSlug.trim().toLowerCase(),
        baseTemperatureC: num(form.baseTemperatureC, 20),
        basePrecipitationMmYear: num(form.basePrecipitationMmYear, 1200),
        deltaTemperatureC: num(form.deltaTemperatureC, 0),
        deltaPrecipitationPct: num(form.deltaPrecipitationPct, 0),
        disturbanceType: form.disturbanceType,
        disturbanceIntensity: Math.min(1, Math.max(0, num(form.disturbanceIntensity, 0))),
        connectivityIndex: Math.min(1, Math.max(0, num(form.connectivityIndex, 0.7))),
      });
      setResult(res.data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-stack">
      {/* Form */}
      <section className="signal-panel signal-panel--llm">
        <div className="signal-panel__header">
          <div>
            <h3>Cenário climático</h3>
            <p>
              Aplique mudanças climáticas e distúrbios a um ecossistema e avalie o risco
              ecológico resultante.
            </p>
          </div>
        </div>

        {/* Ecosystem quick-select */}
        <div>
          <p className="ecology-field-label">Ecossistema</p>
          <div className="llm-chip-row">
            {SUGGESTED_ECOSYSTEMS.map((eco) => (
              <button
                key={eco}
                type="button"
                className={`llm-chip${form.ecosystemSlug === eco ? " is-active" : ""}`}
                onClick={() => setForm((f) => ({ ...f, ecosystemSlug: eco }))}
              >
                {eco}
              </button>
            ))}
          </div>
        </div>

        <div className="ecology-form-grid">
          <div className="ui-input-field">
            <label className="ui-input-field__label">Ecossistema (slug)</label>
            <input
              type="text"
              className="ui-input"
              value={form.ecosystemSlug}
              onChange={setField("ecosystemSlug")}
              placeholder="ex: cerrado"
            />
          </div>

          <div className="ui-input-field">
            <label className="ui-input-field__label">Temperatura base (°C)</label>
            <input type="number" className="ui-input" value={form.baseTemperatureC} onChange={setField("baseTemperatureC")} />
          </div>

          <div className="ui-input-field">
            <label className="ui-input-field__label">Precipitação base (mm/a)</label>
            <input type="number" className="ui-input" value={form.basePrecipitationMmYear} onChange={setField("basePrecipitationMmYear")} />
          </div>

          <div className="ui-input-field">
            <label className="ui-input-field__label">Delta temperatura (°C)</label>
            <input type="number" className="ui-input" step={0.5} min={-10} max={10} value={form.deltaTemperatureC} onChange={setField("deltaTemperatureC")} />
          </div>

          <div className="ui-input-field">
            <label className="ui-input-field__label">Delta precipitação (%)</label>
            <input type="number" className="ui-input" step={5} min={-100} max={200} value={form.deltaPrecipitationPct} onChange={setField("deltaPrecipitationPct")} />
          </div>

          <div className="ui-input-field">
            <label className="ui-input-field__label">Tipo de distúrbio</label>
            <select className="ui-select" value={form.disturbanceType} onChange={setField("disturbanceType")}>
              {DISTURBANCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="ui-input-field">
            <label className="ui-input-field__label">Intensidade distúrbio (0–1)</label>
            <input type="number" className="ui-input" step={0.1} min={0} max={1} value={form.disturbanceIntensity} onChange={setField("disturbanceIntensity")} />
          </div>

          <div className="ui-input-field">
            <label className="ui-input-field__label">Índice de conectividade (0–1)</label>
            <input type="number" className="ui-input" step={0.1} min={0} max={1} value={form.connectivityIndex} onChange={setField("connectivityIndex")} />
          </div>
        </div>

        <div className="form-actions">
          <Button variant="primary" onClick={() => void simulate()} disabled={isLoading}>
            <Thermometer weight="duotone" />
            {isLoading ? "Simulando..." : "Simular cenário"}
          </Button>
        </div>
      </section>

      {isLoading ? <LoadingBlock label="Calculando risco climático..." /> : null}

      {error && !isLoading ? (
        <ErrorState title="Erro na simulação" message={error} onRetry={() => void simulate()} />
      ) : null}

      {!result && !error && !isLoading ? (
        <EmptyState
          icon={<Thermometer weight="duotone" />}
          title="Nenhum cenário simulado"
          description="Configure os parâmetros e simule para ver a comparação de risco ecológico."
          actionLabel="Simular"
          onAction={() => void simulate()}
        />
      ) : null}

      {/* Results */}
      {result && !isLoading ? (
        <>
          {/* Baseline vs Modified comparison */}
          <section className="signal-panel">
            <div className="signal-panel__header">
              <div>
                <h3>Resultado do cenário</h3>
                <p>Comparação entre o estado base e o estado modificado do ecossistema.</p>
              </div>
              <StatusPill
                tone={
                  result.modified.riskLevel === "critical" || result.modified.riskLevel === "high"
                    ? "error"
                    : result.modified.riskLevel === "moderate"
                    ? "warning"
                    : "success"
                }
              >
                Risco {RISK_META[result.modified.riskLevel]?.label ?? result.modified.riskLevel}
              </StatusPill>
            </div>

            <div className="scenario-compare">
              <ScenarioStateCard state={result.baseline} label="Estado base" />
              <ScenarioStateCard state={result.modified} label="Estado modificado" isModified />
            </div>
          </section>

          {/* Applied changes */}
          {result.appliedChanges.length > 0 ? (
            <section className="signal-panel">
              <div className="signal-panel__header">
                <div><h3>Mudanças aplicadas</h3></div>
              </div>
              <div className="changes-list">
                {result.appliedChanges.map((change, i) => (
                  <div key={i} className="change-row">
                    <span className="change-row__param">{change.parameter}</span>
                    <span style={{ color: "var(--color-text-secondary)" }}>{String(change.before)}</span>
                    <ArrowRight weight="bold" style={{ color: "var(--color-brand-primary)" }} />
                    <span style={{ fontWeight: 600 }}>{String(change.after)}</span>
                    <span className="change-row__delta">{change.delta}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* Impact notes */}
          <section className="signal-panel">
            <div className="signal-panel__header">
              <div><h3>Impactos e conectividade</h3></div>
            </div>
            <div className="stack-sm">
              <div className="signal-message signal-message--neutral">
                <Thermometer weight="duotone" />
                <div>
                  <strong>Conectividade</strong>
                  <span>{result.connectivityImpact}</span>
                </div>
              </div>
              {result.disturbanceImpact ? (
                <div className="signal-message signal-message--warning">
                  <WarningCircle weight="duotone" />
                  <div>
                    <strong>Distúrbio</strong>
                    <span>{result.disturbanceImpact}</span>
                  </div>
                </div>
              ) : null}
            </div>

            <div
              className="signal-message signal-message--neutral"
              style={{ marginTop: "0.75rem", opacity: 0.7 }}
            >
              <WarningCircle weight="duotone" />
              <div>
                <strong>Nota de simulação</strong>
                <span>{result.simulationNote}</span>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
