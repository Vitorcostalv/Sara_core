import { useCallback, useEffect, useState } from "react";
import { Cube, WarningCircle } from "@phosphor-icons/react";
import { Button, EmptyState, ErrorState, LoadingBlock, StatusPill } from "../../components/ui";
import { getApiErrorMessage } from "../../services/api/client";
import { ecologyApi } from "../../services/api/ecology";
import type {
  ArtificialEnvResult,
  ArtificialProjectRow,
  ComponentType,
  ConstraintCategory,
} from "../../services/api/ecology";

// ─── Component type styling ───────────────────────────────────────────────────

const COMPONENT_TYPE_TONE: Record<
  ComponentType,
  "success" | "info" | "warning" | "neutral"
> = {
  biotic: "success",
  abiotic: "info",
  structural: "neutral",
  management: "warning",
};

const CONSTRAINT_TONE: Record<
  ConstraintCategory,
  "error" | "warning" | "neutral"
> = {
  ecological: "error",
  technical: "warning",
  governance: "neutral",
};

const SCALE_OPTIONS = [
  { value: "site", label: "Sítio" },
  { value: "local", label: "Local" },
  { value: "watershed", label: "Bacia hidrográfica" },
  { value: "landscape", label: "Paisagem" },
];

// ─── Result view ──────────────────────────────────────────────────────────────

function ArtificialEnvResultView({ result }: { result: ArtificialEnvResult }) {
  return (
    <div className="page-stack">
      {/* Header card */}
      <section className="signal-panel">
        <div className="signal-panel__header">
          <div>
            <h3>{result.projectTitle}</h3>
            <p>{result.objective}</p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <StatusPill tone="warning">{result.projectType}</StatusPill>
            <StatusPill tone="neutral">{result.ecosystemKind}</StatusPill>
            <StatusPill tone="info">{result.scale}</StatusPill>
          </div>
        </div>

        {result.targetEcosystemSlugs.length > 0 ? (
          <div>
            <p className="ecology-field-label">Ecossistemas-alvo</p>
            <div className="llm-chip-row">
              {result.targetEcosystemSlugs.map((slug) => (
                <span key={slug} className="llm-chip is-active" style={{ cursor: "default" }}>
                  {slug}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {/* Design components */}
      <section className="signal-panel">
        <div className="signal-panel__header">
          <div>
            <h3>Componentes de design</h3>
            <p>Estrutura e elementos do ambiente artificial gerado.</p>
          </div>
          <StatusPill tone="neutral">
            {result.designComponents.length} componentes
          </StatusPill>
        </div>

        <div className="catalog-grid">
          {result.designComponents.map((comp) => (
            <article
              key={comp.name}
              className={`component-card${comp.isCritical ? " is-critical" : ""}`}
            >
              <div className="component-card__header">
                <h4 className="component-card__name">{comp.name}</h4>
                <div style={{ display: "flex", gap: "0.35rem" }}>
                  <StatusPill tone={COMPONENT_TYPE_TONE[comp.type]}>{comp.type}</StatusPill>
                  {comp.isCritical ? (
                    <StatusPill tone="error">crítico</StatusPill>
                  ) : null}
                </div>
              </div>
              <p className="component-card__desc">{comp.description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Monitoring recommendations */}
      <section className="signal-panel">
        <div className="signal-panel__header">
          <div>
            <h3>Monitoramento recomendado</h3>
            <p>Indicadores e ações para acompanhar o ambiente artificial ao longo do tempo.</p>
          </div>
        </div>
        <ul className="monitoring-list">
          {result.monitoringRecommendations.map((rec) => (
            <li key={rec}>{rec}</li>
          ))}
        </ul>
      </section>

      {/* Constraints */}
      {result.constraints.length > 0 ? (
        <section className="signal-panel">
          <div className="signal-panel__header">
            <div>
              <h3>Restrições e limitações</h3>
            </div>
          </div>
          <div className="stack-sm">
            {result.constraints.map((c) => (
              <div
                key={c.constraint}
                className={`signal-message signal-message--${
                  CONSTRAINT_TONE[c.category] === "error"
                    ? "warning"
                    : CONSTRAINT_TONE[c.category] === "warning"
                    ? "warning"
                    : "neutral"
                }`}
              >
                <WarningCircle weight="duotone" />
                <div>
                  <strong style={{ textTransform: "capitalize" }}>{c.category}</strong>
                  <span>{c.constraint}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Caution + sim note */}
      <div className="signal-message signal-message--neutral">
        <WarningCircle weight="duotone" />
        <div>
          <strong>Nota de simulação</strong>
          <span>{result.simulationNote}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

export function EcologyArtificialSection() {
  const [projects, setProjects] = useState<ArtificialProjectRow[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  const [selectedSlug, setSelectedSlug] = useState("");
  const [scale, setScale] = useState("site");

  const [result, setResult] = useState<ArtificialEnvResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    setProjectsError(null);
    try {
      const res = await ecologyApi.listArtificialProjects({ pageSize: 50 });
      setProjects(res.data);
      if (res.data.length > 0 && !selectedSlug) {
        setSelectedSlug(res.data[0]!.slug);
      }
    } catch (err) {
      setProjectsError(getApiErrorMessage(err));
    } finally {
      setProjectsLoading(false);
    }
  }, [selectedSlug]);

  useEffect(() => {
    void loadProjects();
  }, []);  // Only on mount

  const generate = async () => {
    if (!selectedSlug) {
      setError("Selecione um projeto artificial.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await ecologyApi.simulateArtificial({
        projectSlug: selectedSlug,
        scale,
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
            <h3>Ambiente artificial</h3>
            <p>
              Selecione um projeto de ambiente artificial e gere sua descrição estrutural
              com componentes de design, monitoramento e restrições.
            </p>
          </div>
        </div>

        {projectsLoading ? (
          <LoadingBlock label="Carregando projetos disponíveis..." />
        ) : projectsError ? (
          <ErrorState
            title="Erro ao carregar projetos"
            message={projectsError}
            onRetry={loadProjects}
          />
        ) : projects.length === 0 ? (
          <div className="signal-message signal-message--warning">
            <WarningCircle weight="duotone" />
            <div>
              <strong>Sem projetos disponíveis</strong>
              <span>Nenhum projeto artificial foi encontrado no banco de dados.</span>
            </div>
          </div>
        ) : (
          <>
            {/* Project quick chips */}
            <div>
              <p className="ecology-field-label">Projetos disponíveis</p>
              <div className="llm-chip-row">
                {projects.map((p) => (
                  <button
                    key={p.slug}
                    type="button"
                    className={`llm-chip${selectedSlug === p.slug ? " is-active" : ""}`}
                    onClick={() => setSelectedSlug(p.slug)}
                    title={p.objective ?? p.description}
                  >
                    {p.title}
                  </button>
                ))}
              </div>
            </div>

            <div className="ecology-form-grid">
              <div className="ui-input-field">
                <label className="ui-input-field__label">Projeto (slug)</label>
                <select
                  className="ui-select"
                  value={selectedSlug}
                  onChange={(e) => setSelectedSlug(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {projects.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="ui-input-field">
                <label className="ui-input-field__label">Escala</label>
                <select
                  className="ui-select"
                  value={scale}
                  onChange={(e) => setScale(e.target.value)}
                >
                  {SCALE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Show selected project info */}
            {selectedSlug ? (
              (() => {
                const proj = projects.find((p) => p.slug === selectedSlug);
                return proj ? (
                  <div className="signal-message signal-message--neutral">
                    <Cube weight="duotone" />
                    <div>
                      <strong>{proj.title}</strong>
                      <span>
                        {proj.project_type} · {proj.ecosystem_kind}
                        {proj.objective ? ` · ${proj.objective.slice(0, 80)}` : ""}
                      </span>
                    </div>
                  </div>
                ) : null;
              })()
            ) : null}
          </>
        )}

        <div className="form-actions">
          <Button
            variant="primary"
            onClick={() => void generate()}
            disabled={isLoading || !selectedSlug}
          >
            <Cube weight="duotone" />
            {isLoading ? "Gerando..." : "Gerar ambiente"}
          </Button>
        </div>
      </section>

      {isLoading ? <LoadingBlock label="Gerando descrição do ambiente artificial..." /> : null}

      {error && !isLoading ? (
        <ErrorState
          title="Erro na geração"
          message={error}
          onRetry={() => void generate()}
        />
      ) : null}

      {!result && !error && !isLoading ? (
        <EmptyState
          icon={<Cube weight="duotone" />}
          title="Nenhum ambiente gerado"
          description="Selecione um projeto e clique em Gerar ambiente para ver os componentes, monitoramento e restrições."
          actionLabel="Gerar ambiente"
          onAction={() => void generate()}
        />
      ) : null}

      {result && !isLoading ? <ArtificialEnvResultView result={result} /> : null}
    </div>
  );
}
