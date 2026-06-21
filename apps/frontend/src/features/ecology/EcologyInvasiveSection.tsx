import { useMemo, useRef, useState } from "react";
import { Bug, WarningCircle } from "@phosphor-icons/react";
import { Button, EmptyState, ErrorState, LoadingBlock, StatusPill } from "../../components/ui";
import { getApiErrorMessage } from "../../services/api/client";
import { ecologyApi } from "../../services/api/ecology";
import type {
  InvasiveScenarioResult,
  PlausibilityRating,
  SpeciesDefinition,
  TerrainCell,
} from "../../services/api/ecology";
import { TerrainView } from "./EcologyTerrainSection";
import type { FaunaEvent } from "./FaunaLayer";

const RATING_LABEL: Record<PlausibilityRating, string> = {
  alto: "Alto",
  medio: "Médio",
  baixo: "Baixo",
};

const RATING_TONE: Record<PlausibilityRating, "success" | "warning" | "error"> = {
  alto: "success",
  medio: "warning",
  baixo: "error",
};

const EFFECT_LABEL: Record<string, string> = {
  predation: "Predação",
  competition: "Competição",
  none: "Sem impacto direto",
};

export function EcologyInvasiveSection() {
  const [speciesText, setSpeciesText] = useState("leão");
  const [locationText, setLocationText] = useState("floresta amazônica");
  const [result, setResult] = useState<InvasiveScenarioResult | null>(null);
  const [faunaSpecies, setFaunaSpecies] = useState<SpeciesDefinition[]>([]);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const simulatedTimeRef = useRef(12);
  const [inspected, setInspected] = useState<TerrainCell | null>(null);
  const [faunaEvents, setFaunaEvents] = useState<FaunaEvent[]>([]);

  const submit = async () => {
    if (!speciesText.trim() || !locationText.trim()) {
      setError("Informe a espécie e o local.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setResult(null);
    setFaunaSpecies([]);
    setPhaseIndex(0);

    try {
      const response = await ecologyApi.invasive({
        speciesText: speciesText.trim(),
        locationText: locationText.trim(),
      });
      const data = response.data;
      setResult(data);

      // Nativos do bioma + invasor injetado (entra na cadeia predatória do FaunaLayer).
      let natives: SpeciesDefinition[] = [];
      try {
        const faunaResponse = await ecologyApi.fauna({ biomes: data.resolvedBiomes });
        natives = faunaResponse.data.species;
      } catch {
        natives = [];
      }
      setFaunaSpecies([...natives, data.invader]);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  };

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const impact of result?.nativeImpacts ?? []) map.set(impact.speciesId, impact.commonName);
    return map;
  }, [result]);

  const phase = result?.phases[phaseIndex];
  const impactedNatives = (result?.nativeImpacts ?? []).filter((i) => i.effect !== "none");

  return (
    <div className="page-stack">
      <style>{`
        .invasive-grid { display: grid; gap: 0.7rem; grid-template-columns: 1fr 1fr; }
        .invasive-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
        .invasive-table th, .invasive-table td { text-align: left; padding: 0.4rem 0.5rem; border-bottom: 1px solid rgba(125,88,55,0.12); }
        .invasive-deltas { display: grid; gap: 0.3rem; margin-top: 0.5rem; }
        .invasive-delta-row { display: flex; justify-content: space-between; gap: 0.6rem; font-size: 0.84rem; }
        .invasive-scrubber { width: 100%; accent-color: #9c6f3d; }
        .invasive-phase-head { display: flex; align-items: baseline; gap: 0.6rem; flex-wrap: wrap; }
        @media (max-width: 720px) { .invasive-grid { grid-template-columns: 1fr; } }
      `}</style>

      <section className="signal-panel signal-panel--llm">
        <div className="signal-panel__header">
          <div>
            <h3>Espécie invasora</h3>
            <p>
              Descreva uma espécie e um local. O sistema avalia, com grounding científico, se a
              invasão é plausível e mostra na prática o invasor entrando na cadeia (predando ou
              competindo com os nativos) no visualizador 3D.
            </p>
          </div>
          {result ? (
            <StatusPill tone={result.invaderProfile.survives ? "warning" : "neutral"}>
              {result.invaderProfile.survives ? "Invasão plausível" : "Invasão improvável"}
            </StatusPill>
          ) : null}
        </div>

        <div className="ecology-form-grid">
          <div className="ui-input-field">
            <label className="ui-input-field__label">Espécie invasora</label>
            <input
              className="ui-input"
              value={speciesText}
              onChange={(e) => setSpeciesText(e.target.value)}
              placeholder="ex: leão, javali, tilápia"
            />
          </div>
          <div className="ui-input-field">
            <label className="ui-input-field__label">Local / bioma</label>
            <input
              className="ui-input"
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              placeholder="ex: floresta amazônica, cerrado"
            />
          </div>
        </div>

        <div className="form-actions">
          <Button variant="primary" onClick={() => void submit()} disabled={isLoading}>
            <Bug weight="duotone" />
            {isLoading ? "Simulando..." : "Simular invasão"}
          </Button>
        </div>
      </section>

      {isLoading ? <LoadingBlock label="Avaliando a invasão..." /> : null}

      {error && !isLoading ? (
        <ErrorState title="Falha na simulação" message={error} onRetry={() => void submit()} />
      ) : null}

      {!result && !error && !isLoading ? (
        <EmptyState
          icon={<Bug weight="duotone" />}
          title="Nenhuma simulação ainda"
          description="Informe uma espécie e um local e simule a invasão."
          actionLabel="Simular invasão"
          onAction={() => void submit()}
        />
      ) : null}

      {result && !isLoading ? (
        <>
          {faunaSpecies.length > 0 ? (
            <TerrainView
              grid={result.terrain}
              faunaSpecies={faunaSpecies}
              faunaPaused={false}
              faunaSpeedMultiplier={1}
              showFauna
              showObjects
              showCaves
              showRivers
              rainEnabled={false}
              rainIntensity={0}
              simulatedTimeRef={simulatedTimeRef}
              onFaunaCountUpdate={() => {}}
              inspected={inspected}
              setInspected={setInspected}
              faunaEvents={faunaEvents}
              setFaunaEvents={setFaunaEvents}
            />
          ) : null}

          <div className="invasive-grid">
            <section className="signal-panel">
              <div className="signal-panel__header">
                <div>
                  <h3>Plausibilidade</h3>
                  <p>
                    {result.invaderProfile.displayName} ({result.invaderProfile.scientificName})
                  </p>
                </div>
                <StatusPill tone={RATING_TONE[result.plausibility.overall]}>
                  {RATING_LABEL[result.plausibility.overall]}
                </StatusPill>
              </div>
              <table className="invasive-table">
                <thead>
                  <tr>
                    <th>Critério</th>
                    <th>Nota</th>
                    <th>Detalhe</th>
                  </tr>
                </thead>
                <tbody>
                  {result.plausibility.criteria.map((c) => (
                    <tr key={c.label}>
                      <td>{c.label}</td>
                      <td>
                        <StatusPill tone={RATING_TONE[c.rating]}>{RATING_LABEL[c.rating]}</StatusPill>
                      </td>
                      <td>{c.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ fontSize: "0.78rem", opacity: 0.7, marginTop: "0.5rem" }}>
                {result.plausibility.caveat}
              </p>
            </section>

            <section className="signal-panel">
              <div className="signal-panel__header">
                <div>
                  <h3>Linha do tempo da invasão</h3>
                  <p>Arraste para percorrer as fases projetadas.</p>
                </div>
              </div>
              <input
                type="range"
                className="invasive-scrubber"
                min={0}
                max={result.phases.length - 1}
                value={phaseIndex}
                onChange={(e) => setPhaseIndex(Number(e.target.value))}
              />
              {phase ? (
                <>
                  <div className="invasive-phase-head">
                    <strong>{phase.label}</strong>
                    <span style={{ opacity: 0.7 }}>t ≈ {phase.tSeconds}s</span>
                    <StatusPill tone="info">população invasora: {phase.invaderPop}</StatusPill>
                  </div>
                  <div className="invasive-deltas">
                    {Object.entries(phase.nativeDeltas).length === 0 ? (
                      <span style={{ fontSize: "0.84rem", opacity: 0.7 }}>
                        Sem impacto projetado sobre os nativos nesta fase.
                      </span>
                    ) : (
                      Object.entries(phase.nativeDeltas).map(([id, delta]) => (
                        <div key={id} className="invasive-delta-row">
                          <span>{nameById.get(id) ?? id}</span>
                          <span style={{ color: delta < 0 ? "#b03a2e" : "#6d4b35" }}>
                            {delta > 0 ? `+${delta}` : delta}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : null}
            </section>
          </div>

          <section className="signal-panel">
            <div className="signal-panel__header">
              <div>
                <h3>Impacto sobre os nativos</h3>
                <p>Efeito do invasor sobre cada espécie nativa do local.</p>
              </div>
            </div>
            {impactedNatives.length === 0 ? (
              <div className="signal-message signal-message--neutral">
                <WarningCircle weight="duotone" />
                <div>
                  <span>Nenhum impacto direto projetado (invasor improvável ou sem sobreposição).</span>
                </div>
              </div>
            ) : (
              <div className="summary-list">
                {impactedNatives.map((impact) => (
                  <div key={impact.speciesId}>
                    <strong>{impact.commonName}</strong>
                    <span>
                      {EFFECT_LABEL[impact.effect]} · Δ população {impact.populationDelta}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="signal-panel">
            <div className="signal-panel__header">
              <div>
                <h3>Explicação científica</h3>
                <p>Avaliação grounded nos fatos do banco.</p>
              </div>
              <StatusPill tone={result.explanation.coverage === "sufficient" ? "success" : "warning"}>
                {result.explanation.coverage === "sufficient" ? "Cobertura suficiente" : "Cobertura limitada"}
              </StatusPill>
            </div>
            <p>{result.explanation.text}</p>

            {result.explanation.facts.length > 0 ? (
              <div className="stack-sm" style={{ marginTop: "0.6rem" }}>
                {result.explanation.facts.map((fact) => (
                  <div key={`${fact.title}-${fact.citationKey ?? ""}`} className="answer-card">
                    <div className="answer-card__meta">
                      <StatusPill tone="neutral">{fact.category}</StatusPill>
                      {fact.citationKey ? <StatusPill tone="info">{fact.citationKey}</StatusPill> : null}
                      {fact.year ? <StatusPill tone="neutral">{fact.year}</StatusPill> : null}
                    </div>
                    <strong>{fact.title}</strong>
                    <p>{fact.text}</p>
                  </div>
                ))}
              </div>
            ) : null}

            {result.limitations.length > 0 ? (
              <div className="stack-sm" style={{ marginTop: "0.6rem" }}>
                {result.limitations.map((limitation) => (
                  <div key={limitation} className="signal-message signal-message--warning">
                    <WarningCircle weight="duotone" />
                    <div>
                      <span>{limitation}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  );
}
