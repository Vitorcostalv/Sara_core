import { useState } from "react";
import { ArrowsClockwise, Plant, WarningCircle } from "@phosphor-icons/react";
import { Button, EmptyState, ErrorState, LoadingBlock } from "../../components/ui";
import { getApiErrorMessage } from "../../services/api/client";
import { ecologyApi } from "../../services/api/ecology";
import type { SuccessionResult } from "../../services/api/ecology";

const ECOSYSTEM_SUGGESTIONS = [
  "cerrado",
  "pantanal",
  "manguezal",
  "recife-de-coral",
  "tundra",
  "taiga",
];

const VULNERABILITY_LABEL: Record<string, string> = {
  high: "Alta",
  moderate: "Moderada",
  low: "Baixa",
};

export function EcologySuccessionSection() {
  const [type, setType] = useState<"primary" | "secondary">("secondary");
  const [startingStage, setStartingStage] = useState("0");
  const [disturbance, setDisturbance] = useState("0.3");
  const [ecosystemSlug, setEcosystemSlug] = useState<string>("");

  const [result, setResult] = useState<SuccessionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await ecologyApi.simulateSuccession({
        type,
        startingStage: Number.parseInt(startingStage, 10),
        disturbanceIntensity: Number.parseFloat(disturbance),
        ecosystemSlug: ecosystemSlug || undefined,
      });
      setResult(response.data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-stack">
      <style>{`
        .succession-timeline { position: relative; margin-top: 0.5rem; padding-left: 1.4rem; }
        .succession-timeline::before {
          content: ""; position: absolute; left: 0.45rem; top: 0.3rem; bottom: 0.3rem;
          width: 2px; background: rgba(66, 212, 200, 0.4);
        }
        .succession-stage { position: relative; padding: 0 0 1.1rem 0; }
        .succession-stage::before {
          content: ""; position: absolute; left: -1.18rem; top: 0.35rem;
          width: 0.7rem; height: 0.7rem; border-radius: 999px;
          background: #42d4c8; box-shadow: 0 0 0 3px rgba(66, 212, 200, 0.18);
        }
        .succession-stage__head { display: flex; align-items: baseline; gap: 0.5rem; flex-wrap: wrap; }
        .succession-stage__head strong { font-size: 0.95rem; }
        .succession-stage__years { font-size: 0.8rem; opacity: 0.7; }
        .succession-stage__vuln {
          font-size: 0.72rem; padding: 0.06rem 0.5rem; border-radius: 999px; margin-left: auto;
        }
        .succession-stage__vuln--high { background: rgba(239, 68, 68, 0.2); }
        .succession-stage__vuln--moderate { background: rgba(234, 179, 8, 0.2); }
        .succession-stage__vuln--low { background: rgba(34, 197, 94, 0.2); }
        .succession-stage__body { font-size: 0.86rem; opacity: 0.88; margin: 0.25rem 0; }
        .succession-stage__types { font-size: 0.8rem; opacity: 0.7; }
      `}</style>

      <section className="signal-panel signal-panel--llm">
        <div className="signal-panel__header">
          <div>
            <h3>Evolução do ecossistema</h3>
            <p>
              Simula a sucessão ecológica em estágios — do ambiente inicial ao clímax — e mostra
              como distúrbios podem reiniciar a trajetória.
            </p>
          </div>
        </div>

        <div className="llm-chip-row">
          {(["secondary", "primary"] as const).map((t) => (
            <button
              key={t}
              type="button"
              className={`llm-chip${type === t ? " is-active" : ""}`}
              onClick={() => setType(t)}
            >
              {t === "secondary" ? "Secundária (área degradada)" : "Primária (substrato nu)"}
            </button>
          ))}
        </div>

        <div className="ecology-form-grid">
          <div className="ui-input-field">
            <label className="ui-input-field__label">Estágio inicial (0–4)</label>
            <input
              type="number"
              className="ui-input"
              min={0}
              max={4}
              value={startingStage}
              onChange={(e) => setStartingStage(e.target.value)}
            />
          </div>
          <div className="ui-input-field">
            <label className="ui-input-field__label">Intensidade de distúrbio (0–1)</label>
            <input
              type="number"
              className="ui-input"
              min={0}
              max={1}
              step={0.1}
              value={disturbance}
              onChange={(e) => setDisturbance(e.target.value)}
            />
          </div>
        </div>

        <div>
          <p className="ecology-field-label">Ecossistema de referência (opcional)</p>
          <div className="llm-chip-row">
            {ECOSYSTEM_SUGGESTIONS.map((slug) => (
              <button
                key={slug}
                type="button"
                className={`llm-chip${ecosystemSlug === slug ? " is-active" : ""}`}
                onClick={() => setEcosystemSlug((cur) => (cur === slug ? "" : slug))}
              >
                {slug}
              </button>
            ))}
          </div>
        </div>

        <div className="form-actions">
          <Button variant="primary" onClick={() => void submit()} disabled={isLoading}>
            <Plant weight="duotone" />
            {isLoading ? "Simulando..." : "Simular evolução"}
          </Button>
        </div>
      </section>

      {isLoading ? <LoadingBlock label="Projetando estágios de sucessão..." /> : null}

      {error && !isLoading ? (
        <ErrorState title="Falha na simulação" message={error} onRetry={() => void submit()} />
      ) : null}

      {!result && !error && !isLoading ? (
        <EmptyState
          icon={<Plant weight="duotone" />}
          title="Nenhuma simulação ainda"
          description="Escolha o tipo de sucessão no formulário acima e simule a evolução do ecossistema ao longo do tempo."
        />
      ) : null}

      {result && !isLoading ? (
        <section className="signal-panel">
          <div className="signal-panel__header">
            <div>
              <h3>Trajetória sucessional</h3>
              <p>
                Tipo {result.type === "primary" ? "primária" : "secundária"} · estágio inicial{" "}
                {result.startingStage} · ~{result.estimatedYearsToClimax} anos até o clímax
                {result.isDisturbanceReset ? " · distúrbio reiniciou a sucessão" : ""}.
              </p>
            </div>
          </div>

          {result.warnings.length > 0 ? (
            <div className="stack-sm" style={{ marginBottom: "0.75rem" }}>
              {result.warnings.map((w) => (
                <div key={w} className="signal-message signal-message--warning">
                  <WarningCircle weight="duotone" />
                  <div>
                    <span>{w}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="succession-timeline">
            {result.stages.map((s) => (
              <div key={s.stage} className="succession-stage">
                <div className="succession-stage__head">
                  <strong>
                    {s.stage}. {s.label}
                  </strong>
                  <span className="succession-stage__years">
                    {s.estimatedDurationYearsMin}–{s.estimatedDurationYearsMax} anos
                  </span>
                  <span className={`succession-stage__vuln succession-stage__vuln--${s.disturbanceVulnerability}`}>
                    Vulnerabilidade: {VULNERABILITY_LABEL[s.disturbanceVulnerability] ?? s.disturbanceVulnerability}
                  </span>
                </div>
                <p className="succession-stage__body">{s.dominantProcess}</p>
                <p className="succession-stage__types">
                  {s.characteristicFunctionalTypes.join(", ")} — {s.exampleSpeciesNotes}
                </p>
              </div>
            ))}
          </div>

          <div className="signal-message signal-message--neutral" style={{ marginTop: "0.5rem" }}>
            <ArrowsClockwise weight="duotone" />
            <div>
              <strong>Nota da simulação</strong>
              <span>{result.simulationNote}</span>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
