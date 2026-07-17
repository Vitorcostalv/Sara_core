import { useEffect, useMemo, useRef, useState } from "react";
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
import { getOfflineInvasiveSnapshot, saveLastScenario } from "../../demo/offline";

const RATING_LABEL: Record<PlausibilityRating, string> = {
  alto: "Alto",
  medio: "Medio",
  baixo: "Baixo",
};

const RATING_TONE: Record<PlausibilityRating, "success" | "warning" | "error"> = {
  alto: "success",
  medio: "warning",
  baixo: "error",
};

const EFFECT_LABEL: Record<string, string> = {
  predation: "Predacao",
  competition: "Competicao",
  "habitat-alteration": "Alteracao de habitat",
  disease: "Doenca",
  "resource-pressure": "Pressao sobre recursos",
  none: "Sem impacto direto",
};

export function EcologyInvasiveSection({ initialOfflineScenarioId }: { initialOfflineScenarioId?: string | null } = {}) {
  const [speciesText, setSpeciesText] = useState("leao");
  const [locationText, setLocationText] = useState("floresta amazonica");
  const [result, setResult] = useState<InvasiveScenarioResult | null>(null);
  const [faunaSpecies, setFaunaSpecies] = useState<SpeciesDefinition[]>([]);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offlineDisclosure, setOfflineDisclosure] = useState<string | null>(null);
  const simulatedTimeRef = useRef(12);
  const [inspected, setInspected] = useState<TerrainCell | null>(null);
  const [faunaEvents, setFaunaEvents] = useState<FaunaEvent[]>([]);

  const submit = async () => {
    if (!speciesText.trim() || !locationText.trim()) {
      setError("Informe a especie e o local.");
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
      setOfflineDisclosure(null);
      saveLastScenario({ scenarioId: "invasao-javali-cerrado", mode: "live", invasiveResult: data });

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

  const openOfflineJavali = () => {
    const snapshot = getOfflineInvasiveSnapshot();
    setSpeciesText("javali");
    setLocationText("cerrado brasileiro");
    setResult(snapshot.result);
    setFaunaSpecies([snapshot.result.invader]);
    setPhaseIndex(0);
    setError(null);
    setOfflineDisclosure(snapshot.meta.disclosure);
    saveLastScenario({ scenarioId: "invasao-javali-cerrado", mode: "offline", invasiveResult: snapshot.result });
  };

  useEffect(() => {
    if (initialOfflineScenarioId === "invasao-javali-cerrado") openOfflineJavali();
  }, [initialOfflineScenarioId]);

  const phase = result?.phases[phaseIndex];
  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const impact of result?.nativeImpacts ?? []) map.set(impact.speciesId, impact.commonName);
    return map;
  }, [result]);
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
            <h3>Especie invasora</h3>
            <p>
              Descreva uma especie e um local. O sistema avalia, com grounding cientifico, se a
              invasao e plausivel e mostra na pratica o invasor convivendo com a fauna nativa no
              visualizador 3D.
            </p>
          </div>
          {result ? (
            <StatusPill tone={result.invaderProfile.survives ? "warning" : "neutral"}>
              {result.invaderProfile.survives ? "Invasao plausivel" : "Invasao improvavel"}
            </StatusPill>
          ) : null}
        </div>

        <div className="ecology-form-grid">
          <div className="ui-input-field">
            <label className="ui-input-field__label">Especie invasora</label>
            <input
              className="ui-input"
              value={speciesText}
              onChange={(e) => setSpeciesText(e.target.value)}
              placeholder="ex: leao, javali, tilapia"
            />
          </div>
          <div className="ui-input-field">
            <label className="ui-input-field__label">Local / bioma</label>
            <input
              className="ui-input"
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              placeholder="ex: floresta amazonica, cerrado"
            />
          </div>
        </div>

        <div className="form-actions">
          <Button variant="primary" onClick={() => void submit()} disabled={isLoading}>
            <Bug weight="duotone" />
            {isLoading ? "Simulando..." : "Simular invasao"}
          </Button>
          <Button variant="secondary" onClick={openOfflineJavali} disabled={isLoading}>
            Demo offline: javali no Cerrado
          </Button>
        </div>
      </section>

      {offlineDisclosure ? (
        <div className="signal-message signal-message--warning">
          <WarningCircle weight="duotone" />
          <div>
            <strong>Modo de demonstracao offline</strong>
            <span>{offlineDisclosure}</span>
          </div>
        </div>
      ) : null}

      {isLoading ? <LoadingBlock label="Avaliando a invasao..." /> : null}

      {error && !isLoading ? (
        <ErrorState title="Falha na simulacao" message={error} onRetry={() => void submit()} />
      ) : null}

      {!result && !error && !isLoading ? (
        <EmptyState
          icon={<Bug weight="duotone" />}
          title="Nenhuma simulação ainda"
          description="Informe uma espécie e um local no formulário acima para avaliar a invasão."
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
              invasiveSpeciesIds={[result.invader.id]}
              invasiveOverlay={{
                invaderSpeciesId: result.invader.id,
                invaderName: result.invaderProfile.displayName,
                invaderScientificName: result.invaderProfile.scientificName,
                phaseLabel: phase?.label,
                impactMechanisms:
                  (result.impactMechanisms?.map((entry) => entry.label) as string[] | undefined) ??
                  Array.from(
                    new Set(
                      result.nativeImpacts
                        .map((entry) => EFFECT_LABEL[entry.effect] ?? entry.effect)
                        .filter(Boolean),
                    ),
                  ),
                affectedSpecies: result.nativeImpacts.map((entry) => ({
                  speciesId: entry.speciesId,
                  commonName: entry.commonName,
                  effect: EFFECT_LABEL[entry.effect] ?? entry.effect,
                  populationDelta: entry.populationDelta,
                })),
                simulatedNotes:
                  result.simulationScope?.simulated ?? [
                    "presenca visual da invasora",
                    "interacao local com fauna nativa",
                    "eventos de predacao e fuga",
                  ],
                explanationOnlyNotes:
                  result.simulationScope?.explanationOnly ?? [
                    "efeitos ecossistemicos de longo prazo",
                  ],
              }}
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
                    <th>Criterio</th>
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
                  <h3>Linha do tempo da invasao</h3>
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
                    <span style={{ opacity: 0.7 }}>t ~ {phase.tSeconds}s</span>
                    <StatusPill tone="info">populacao invasora: {phase.invaderPop}</StatusPill>
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
                <p>Efeito do invasor sobre cada especie nativa do local.</p>
              </div>
            </div>
            {impactedNatives.length === 0 ? (
              <div className="signal-message signal-message--neutral">
                <WarningCircle weight="duotone" />
                <div>
                  <span>Nenhum impacto direto projetado.</span>
                </div>
              </div>
            ) : (
              <div className="summary-list">
                {impactedNatives.map((impact) => (
                  <div key={impact.speciesId}>
                    <strong>{impact.commonName}</strong>
                    <span>
                      {EFFECT_LABEL[impact.effect] ?? impact.effect} · delta populacao {impact.populationDelta}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="signal-panel">
            <div className="signal-panel__header">
              <div>
                <h3>Mecanismos de impacto</h3>
                <p>Mecanismos ecologicos nomeados, definidos por servicos deterministicos (nao pela IA).</p>
              </div>
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                {result.establishmentPlausibility ? (
                  <StatusPill
                    tone={
                      result.establishmentPlausibility.label === "alta"
                        ? "success"
                        : result.establishmentPlausibility.label === "moderada"
                          ? "warning"
                          : "error"
                    }
                  >
                    Estabelecimento: {result.establishmentPlausibility.score}/100
                  </StatusPill>
                ) : null}
                {result.spreadPressure ? (
                  <StatusPill
                    tone={
                      result.spreadPressure === "alta"
                        ? "error"
                        : result.spreadPressure === "moderada"
                          ? "warning"
                          : "neutral"
                    }
                  >
                    Dispersao: {result.spreadPressure}
                  </StatusPill>
                ) : null}
              </div>
            </div>
            {result.impactMechanisms && result.impactMechanisms.length > 0 ? (
              <div className="summary-list">
                {result.impactMechanisms.map((m) => (
                  <div key={m.kind}>
                    <strong>{m.label}</strong>{" "}
                    <StatusPill
                      tone={m.severity === "alta" ? "error" : m.severity === "moderada" ? "warning" : "neutral"}
                    >
                      {m.severity}
                    </StatusPill>
                    <span>{m.description}</span>
                    {m.targets && m.targets.length > 0 ? (
                      <span style={{ opacity: 0.75 }}>Alvos: {m.targets.join(", ")}</span>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="signal-message signal-message--neutral">
                <WarningCircle weight="duotone" />
                <div>
                  <span>
                    Nenhum mecanismo de impacto identificado — a especie provavelmente nao se
                    estabelece neste bioma.
                  </span>
                </div>
              </div>
            )}

            {result.affectedResources && result.affectedResources.length > 0 ? (
              <p style={{ fontSize: "0.84rem", marginTop: "0.5rem" }}>
                <strong>Recursos afetados:</strong>{" "}
                {result.affectedResources.map((r) => r.label).join(", ")}
              </p>
            ) : null}

            {((result.uncertainties?.length ?? 0) > 0 || (result.mvpAssumptions?.length ?? 0) > 0) ? (
              <div className="stack-sm" style={{ marginTop: "0.6rem" }}>
                {(result.uncertainties ?? []).map((u) => (
                  <div key={u} className="signal-message signal-message--warning">
                    <WarningCircle weight="duotone" />
                    <div>
                      <span>Incerteza: {u}</span>
                    </div>
                  </div>
                ))}
                {(result.mvpAssumptions ?? []).map((a) => (
                  <div key={a} className="signal-message signal-message--neutral">
                    <div>
                      <span>Premissa: {a}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          <section className="signal-panel">
            <div className="signal-panel__header">
              <div>
                <h3>Explicacao cientifica</h3>
                <p>Avaliacao grounded nos fatos do banco.</p>
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
