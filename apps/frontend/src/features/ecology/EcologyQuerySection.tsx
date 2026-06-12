import { useState } from "react";
import {
  BracketsCurly,
  CaretDown,
  Flask,
  Leaf,
  Mountains,
  Sparkle,
  WarningCircle,
} from "@phosphor-icons/react";
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingBlock,
  StatusPill,
  TextArea,
} from "../../components/ui";
import { getApiErrorMessage } from "../../services/api/client";
import { ecologyApi } from "../../services/api/ecology";
import type { EcologicalLlmResult } from "../../services/api/ecology";

// ─── Suggestions ──────────────────────────────────────────────────────────────

const SUGGESTED_ECOSYSTEMS = [
  "cerrado",
  "manguezal",
  "caatinga",
  "pantanal",
  "mata-atlantica",
  "floresta-tropical-umida",
  "recife-de-coral",
  "tundra",
];

const GROUNDING_CATEGORIES = [
  "ecosystem",
  "concept",
  "formation-process",
  "abiotic-factor",
  "species",
  "artificial-project",
  "modeling-approach",
  "reference",
] as const;

type GroundingCategory = (typeof GROUNDING_CATEGORIES)[number];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toggleItem(current: string[], item: string): string[] {
  return current.includes(item)
    ? current.filter((x) => x !== item)
    : [...current, item];
}

const RISK_LABEL: Record<string, string> = {
  sufficient: "Cobertura suficiente",
  insufficient: "Cobertura insuficiente",
};

const QUERY_TYPE_LABEL: Record<string, string> = {
  factual: "Factual",
  comparative: "Comparativa",
  causal: "Causal",
  restoration: "Restauração",
  modeling: "Modelagem",
  speculative: "Especulativa",
  "artificial-project": "Projeto artificial",
};

// ─── Component ────────────────────────────────────────────────────────────────

interface EcologyQuerySectionProps {
  /** Dispara a geração de um ecossistema 3D na aba Terreno a partir do prompt atual. */
  onGenerateEcosystem?: (prompt: string) => void;
}

export function EcologyQuerySection({ onGenerateEcosystem }: EcologyQuerySectionProps = {}) {
  const [prompt, setPrompt] = useState(
    "Quais são as principais características do cerrado e como ele se diferencia da caatinga em termos de biodiversidade?"
  );
  const [ecosystems, setEcosystems] = useState<string[]>(["cerrado", "caatinga"]);
  const [categories, setCategories] = useState<GroundingCategory[]>([]);
  const [maxFacts, setMaxFacts] = useState("16");
  const [includeInspection, setIncludeInspection] = useState(false);

  const [result, setResult] = useState<EcologicalLlmResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastDryRun, setLastDryRun] = useState(false);

  const submit = async (runAsDryRun: boolean) => {
    if (!prompt.trim()) {
      setError("Escreva uma pergunta antes de continuar.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setResult(null);
    setLastDryRun(runAsDryRun);

    try {
      const parsedMaxFacts = Number.parseInt(maxFacts, 10);
      const response = await ecologyApi.generate({
        prompt: prompt.trim(),
        ecosystems,
        categories: categories.length > 0 ? categories : undefined,
        maxFacts: Number.isFinite(parsedMaxFacts) ? parsedMaxFacts : 16,
        dryRun: runAsDryRun,
        includeInspection,
      });
      setResult(response.data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const generateEcosystem = () => {
    if (!prompt.trim()) {
      setError("Descreva o ecossistema antes de gerar (ex: \"cerrado\").");
      return;
    }
    setError(null);
    onGenerateEcosystem?.(prompt.trim());
  };

  const coverageTone =
    result?.groundingCoverage === "sufficient" ? "success" : "warning";

  return (
    <div className="page-stack">
      {/* ── Form panel ── */}
      <section className="signal-panel signal-panel--llm" data-testid="ecology-query-panel">
        <div className="signal-panel__header">
          <div>
            <h3>Consulta ecológica</h3>
            <p>
              Faça uma pergunta sobre ecologia ambiental (resposta grounded nos dados
              do banco) ou descreva um bioma e use "Gerar ecossistema" para montá-lo em
              3D na aba Terreno.
            </p>
          </div>
          {result ? (
            <StatusPill tone={result.dryRun ? "warning" : "success"}>
              {result.dryRun ? "Modo inspeção" : "Resposta gerada"}
            </StatusPill>
          ) : null}
        </div>

        <TextArea
          label="Pergunta"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          data-testid="ecology-prompt-input"
        />

        {/* Ecosystem chips */}
        <div>
          <p className="ecology-field-label">Ecossistemas (sugestões)</p>
          <div className="llm-chip-row">
            {SUGGESTED_ECOSYSTEMS.map((eco) => (
              <button
                key={eco}
                type="button"
                className={`llm-chip${ecosystems.includes(eco) ? " is-active" : ""}`}
                onClick={() => setEcosystems((cur) => toggleItem(cur, eco))}
              >
                {eco}
              </button>
            ))}
          </div>
        </div>

        {/* Category chips */}
        <div>
          <p className="ecology-field-label">Categorias (opcional — padrão: todas)</p>
          <div className="category-chip-row">
            {GROUNDING_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`category-chip${categories.includes(cat) ? " is-active" : ""}`}
                onClick={() =>
                  setCategories((cur) =>
                    toggleItem(cur as string[], cat) as GroundingCategory[]
                  )
                }
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Max facts + toggles */}
        <div className="ecology-form-grid">
          <div className="ui-input-field">
            <label className="ui-input-field__label">Máx. fatos</label>
            <input
              type="number"
              className="ui-input"
              value={maxFacts}
              min={1}
              max={30}
              onChange={(e) => setMaxFacts(e.target.value)}
            />
          </div>

          <div className="toggle-grid" style={{ gridColumn: "1 / -1" }}>
            <button
              type="button"
              className={`toggle-card${includeInspection ? " is-active" : ""}`}
              onClick={() => setIncludeInspection((v) => !v)}
            >
              <BracketsCurly weight="duotone" />
              <div>
                <strong>Inspeção técnica</strong>
                <span>Inclui detalhes de contexto e fatos na resposta.</span>
              </div>
            </button>
          </div>
        </div>

        <div className="form-actions">
          <Button
            variant="secondary"
            onClick={() => void submit(true)}
            disabled={isLoading}
            data-testid="ecology-dryrun-btn"
          >
            <Flask weight="duotone" />
            {isLoading && lastDryRun ? "Inspecionando..." : "Inspecionar contexto"}
          </Button>
          <Button
            variant="primary"
            onClick={() => void submit(false)}
            disabled={isLoading}
            data-testid="ecology-submit-btn"
          >
            <Sparkle weight="duotone" />
            {isLoading && !lastDryRun ? "Gerando..." : "Gerar resposta"}
          </Button>
          {onGenerateEcosystem ? (
            <Button
              variant="primary"
              onClick={generateEcosystem}
              disabled={isLoading || !prompt.trim()}
              data-testid="ecology-generate-ecosystem-btn"
            >
              <Mountains weight="duotone" />
              Gerar ecossistema
            </Button>
          ) : null}
        </div>
      </section>

      {/* ── States ── */}
      {isLoading ? (
        <LoadingBlock label="Consultando dados ecológicos..." />
      ) : null}

      {error && !isLoading ? (
        <ErrorState
          title="Falha na consulta"
          message={error}
          onRetry={() => void submit(lastDryRun)}
        />
      ) : null}

      {!result && !error && !isLoading ? (
        <EmptyState
          icon={<Leaf weight="duotone" />}
          title="Nenhuma consulta ainda"
          description="Use o formulário acima para fazer uma pergunta grounded sobre ecologia ambiental."
          actionLabel="Inspecionar contexto"
          onAction={() => void submit(true)}
        />
      ) : null}

      {/* ── Result ── */}
      {result && !isLoading ? (
        <>
          <div className="llm-results-grid">
            {/* Answer panel */}
            <section className="signal-panel" data-testid="ecology-answer-panel">
              <div className="signal-panel__header">
                <div>
                  <h3>{result.dryRun ? "Inspeção de contexto" : "Resposta"}</h3>
                  <p>
                    {result.dryRun
                      ? "O contexto foi recuperado. Abra os detalhes técnicos para inspecionar."
                      : "Resposta gerada a partir dos fatos ecológicos do banco."}
                  </p>
                </div>
                <StatusPill tone={result.dryRun ? "warning" : result.answer ? "success" : "warning"}>
                  {result.dryRun
                    ? "Dry-run"
                    : result.answer
                    ? "Disponível"
                    : "Sem resposta"}
                </StatusPill>
              </div>

              <article className="answer-card">
                <div className="answer-card__meta">
                  <StatusPill tone="info">{result.provider}</StatusPill>
                  <StatusPill tone="neutral">{result.model}</StatusPill>
                  <StatusPill tone="neutral">
                    {QUERY_TYPE_LABEL[result.queryType] ?? result.queryType}
                  </StatusPill>
                </div>
                <p>
                  {result.answer ??
                    (result.dryRun
                      ? "Inspeção concluída. Nenhuma resposta final foi gerada — revise o contexto nos detalhes técnicos."
                      : "Nenhuma resposta foi retornada nesta execução.")}
                </p>
              </article>
            </section>

            {/* Coverage / Warnings panel */}
            <section className="signal-panel" data-testid="ecology-coverage-panel">
              <div className="signal-panel__header">
                <div>
                  <h3>Cobertura e avisos</h3>
                  <p>Informações sobre a qualidade do contexto recuperado.</p>
                </div>
                <StatusPill tone={coverageTone}>
                  {RISK_LABEL[result.groundingCoverage] ?? result.groundingCoverage}
                </StatusPill>
              </div>

              <div className="summary-list">
                <div>
                  <strong>Fatos usados</strong>
                  <span>{result.factsUsed}</span>
                </div>
                <div>
                  <strong>Ecossistemas encontrados</strong>
                  <span>
                    {result.ecosystemsFound.length > 0
                      ? result.ecosystemsFound.join(", ")
                      : "nenhum"}
                  </span>
                </div>
              </div>

              {result.warnings.length === 0 ? (
                <div className="signal-message signal-message--success">
                  <Sparkle weight="duotone" />
                  <div>
                    <strong>Sem avisos</strong>
                    <span>O contexto foi montado sem alertas.</span>
                  </div>
                </div>
              ) : (
                <div className="stack-sm">
                  {result.warnings.map((w) => (
                    <div key={w} className="signal-message signal-message--warning">
                      <WarningCircle weight="duotone" />
                      <div>
                        <strong>Aviso</strong>
                        <span>{w}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Technical details (collapsible) */}
          <details className="signal-panel technical-details" data-testid="ecology-technical-details">
            <summary className="technical-details__summary">
              <div>
                <strong>Detalhes técnicos</strong>
                <span>Contexto enviado ao modelo, fatos recuperados e inspeção completa.</span>
              </div>
              <CaretDown weight="bold" />
            </summary>

            <div className="stack-lg technical-details__content">
              <section>
                <div className="signal-panel__header">
                  <div>
                    <h3>Preview do contexto</h3>
                  </div>
                </div>
                <pre className="context-panel" data-testid="ecology-context-preview">
                  {result.contextPreview || "(contexto vazio)"}
                </pre>
              </section>

              {result.inspection ? (
                <section>
                  <div className="signal-panel__header">
                    <div>
                      <h3>Objeto de inspeção</h3>
                    </div>
                  </div>
                  <pre className="context-panel">
                    {JSON.stringify(result.inspection, null, 2)}
                  </pre>
                </section>
              ) : null}
            </div>
          </details>
        </>
      ) : null}
    </div>
  );
}
