import { useCallback, useEffect, useState } from "react";
import { BookOpen, Circle, Cube, Drop, TreeStructure } from "@phosphor-icons/react";
import { EmptyState, ErrorState, LoadingBlock, StatusPill } from "../../components/ui";
import { getApiErrorMessage } from "../../services/api/client";
import { ecologyApi } from "../../services/api/ecology";
import type {
  AbioticFactorRow,
  ArtificialProjectRow,
  DomainCoverageStats,
  EcosystemRow,
  ModelingApproachRow,
  SpeciesRow,
} from "../../services/api/ecology";

// ─── Inner tab ids ────────────────────────────────────────────────────────────

type CatalogTab =
  | "ecosystems"
  | "species"
  | "abiotic"
  | "projects"
  | "modeling"
  | "coverage";

const CATALOG_TABS: { id: CatalogTab; label: string }[] = [
  { id: "ecosystems", label: "Ecossistemas" },
  { id: "species", label: "Espécies" },
  { id: "abiotic", label: "Fatores Abióticos" },
  { id: "projects", label: "Proj. Artificiais" },
  { id: "modeling", label: "Modelagem" },
  { id: "coverage", label: "Cobertura" },
];

// ─── Ecosystem kind badge tone ────────────────────────────────────────────────

function kindTone(kind: string): "success" | "info" | "warning" | "neutral" {
  if (kind === "natural") return "success";
  if (kind === "restored") return "info";
  if (kind === "artificial") return "warning";
  return "neutral";
}

function trophicTone(role: string | null): "info" | "warning" | "neutral" {
  if (!role) return "neutral";
  if (role.toLowerCase().includes("produtor")) return "success" as "info";
  if (role.toLowerCase().includes("predador") || role.toLowerCase().includes("carnívoro"))
    return "warning";
  return "info";
}

// ─── Ecosystems sub-panel ─────────────────────────────────────────────────────

function EcosystemsPanel() {
  const [items, setItems] = useState<EcosystemRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await ecologyApi.listEcosystems({ page: p, pageSize: 12 });
      setItems(res.data);
      setTotal(res.meta.total);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(page);
  }, [load, page]);

  if (isLoading) return <LoadingBlock label="Carregando ecossistemas..." />;
  if (error) return <ErrorState title="Erro" message={error} onRetry={() => void load(page)} />;
  if (items.length === 0) return <EmptyState icon={<Circle />} title="Nenhum ecossistema" description="Nenhum ecossistema encontrado no banco." />;

  return (
    <div className="page-stack">
      <div className="catalog-grid">
        {items.map((eco) => (
          <article key={eco.id} className="catalog-card">
            <div className="catalog-card__pills">
              <StatusPill tone={kindTone(eco.ecosystem_kind)}>{eco.ecosystem_kind}</StatusPill>
              <StatusPill tone="neutral">{eco.medium}</StatusPill>
              {eco.climate_code ? (
                <StatusPill tone="info">{eco.climate_code}</StatusPill>
              ) : null}
            </div>
            <h4 className="catalog-card__title">{eco.title}</h4>
            {eco.biome_title ? (
              <p className="catalog-card__sub">{eco.biome_title}</p>
            ) : null}
            {eco.description ? (
              <p className="catalog-card__sub" style={{ marginTop: "0.25rem" }}>
                {eco.description.length > 160
                  ? `${eco.description.slice(0, 160)}…`
                  : eco.description}
              </p>
            ) : null}
            {eco.ecoregion_label ? (
              <p className="catalog-card__sub" style={{ fontSize: "0.78rem" }}>
                {eco.ecoregion_label}
              </p>
            ) : null}
          </article>
        ))}
      </div>

      {total > 12 ? (
        <div className="ui-pagination">
          <span className="ui-pagination__summary">
            Página {page} · {total} ecossistemas
          </span>
          <div className="ui-pagination__actions">
            <button
              type="button"
              className="ui-button ui-button--secondary ui-button--sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </button>
            <button
              type="button"
              className="ui-button ui-button--secondary ui-button--sm"
              disabled={page * 12 >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ─── Species sub-panel ────────────────────────────────────────────────────────

function SpeciesPanel() {
  const [items, setItems] = useState<SpeciesRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await ecologyApi.listSpecies({ page: p, pageSize: 12 });
      setItems(res.data);
      setTotal(res.meta.total);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(page);
  }, [load, page]);

  if (isLoading) return <LoadingBlock label="Carregando espécies..." />;
  if (error) return <ErrorState title="Erro" message={error} onRetry={() => void load(page)} />;
  if (items.length === 0) return <EmptyState icon={<Circle />} title="Nenhuma espécie" description="Nenhuma espécie encontrada no banco." />;

  return (
    <div className="page-stack">
      <div className="catalog-grid">
        {items.map((sp) => (
          <article key={sp.id} className="catalog-card">
            <div className="catalog-card__pills">
              {sp.trophic_role_label ? (
                <StatusPill tone={trophicTone(sp.trophic_role_label)}>
                  {sp.trophic_role_label}
                </StatusPill>
              ) : null}
              {sp.conservation_status ? (
                <StatusPill
                  tone={
                    sp.conservation_status.includes("CR") || sp.conservation_status.includes("EN")
                      ? "error"
                      : sp.conservation_status.includes("VU")
                      ? "warning"
                      : "neutral"
                  }
                >
                  {sp.conservation_status}
                </StatusPill>
              ) : null}
            </div>
            <h4 className="catalog-card__title" style={{ fontStyle: "italic" }}>
              {sp.scientific_name}
            </h4>
            {sp.common_name ? (
              <p className="catalog-card__sub">{sp.common_name}</p>
            ) : null}
            {sp.ecosystem_slugs.length > 0 ? (
              <div className="catalog-card__pills" style={{ marginTop: "0.35rem" }}>
                {sp.ecosystem_slugs.slice(0, 3).map((slug) => (
                  <StatusPill key={slug} tone="neutral">
                    {slug}
                  </StatusPill>
                ))}
                {sp.ecosystem_slugs.length > 3 ? (
                  <StatusPill tone="neutral">+{sp.ecosystem_slugs.length - 3}</StatusPill>
                ) : null}
              </div>
            ) : null}
          </article>
        ))}
      </div>

      {total > 12 ? (
        <div className="ui-pagination">
          <span className="ui-pagination__summary">
            Página {page} · {total} espécies
          </span>
          <div className="ui-pagination__actions">
            <button
              type="button"
              className="ui-button ui-button--secondary ui-button--sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </button>
            <button
              type="button"
              className="ui-button ui-button--secondary ui-button--sm"
              disabled={page * 12 >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ─── Abiotic factors sub-panel ────────────────────────────────────────────────

function AbioticPanel() {
  const [items, setItems] = useState<AbioticFactorRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    ecologyApi
      .listAbioticFactors()
      .then((res) => {
        const rows = Array.isArray(res.data) ? res.data : [];
        setItems(rows);
      })
      .catch((err: unknown) => setError(getApiErrorMessage(err)))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <LoadingBlock label="Carregando fatores abióticos..." />;
  if (error) return <ErrorState title="Erro" message={error} />;
  if (items.length === 0)
    return <EmptyState icon={<Drop />} title="Sem fatores" description="Nenhum fator abiótico registrado." />;

  return (
    <div className="catalog-grid">
      {items.map((f) => (
        <article key={f.id} className="catalog-card">
          <div className="catalog-card__pills">
            <StatusPill tone="info">{f.factor_type}</StatusPill>
            {f.unit ? <StatusPill tone="neutral">{f.unit}</StatusPill> : null}
          </div>
          <h4 className="catalog-card__title">{f.title}</h4>
          {f.description ? (
            <p className="catalog-card__sub">
              {f.description.length > 140
                ? `${f.description.slice(0, 140)}…`
                : f.description}
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}

// ─── Artificial projects sub-panel ───────────────────────────────────────────

function ProjectsPanel() {
  const [items, setItems] = useState<ArtificialProjectRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await ecologyApi.listArtificialProjects({ page: p, pageSize: 10 });
      setItems(res.data);
      setTotal(res.meta.total);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(page);
  }, [load, page]);

  if (isLoading) return <LoadingBlock label="Carregando projetos artificiais..." />;
  if (error) return <ErrorState title="Erro" message={error} onRetry={() => void load(page)} />;
  if (items.length === 0)
    return <EmptyState icon={<Cube />} title="Nenhum projeto" description="Nenhum projeto artificial registrado." />;

  return (
    <div className="page-stack">
      <div className="catalog-grid">
        {items.map((proj) => (
          <article key={proj.id} className="catalog-card">
            <div className="catalog-card__pills">
              <StatusPill tone="warning">{proj.project_type}</StatusPill>
              <StatusPill tone="neutral">{proj.ecosystem_kind}</StatusPill>
            </div>
            <h4 className="catalog-card__title">{proj.title}</h4>
            {proj.objective ? (
              <p className="catalog-card__sub">
                {proj.objective.length > 140
                  ? `${proj.objective.slice(0, 140)}…`
                  : proj.objective}
              </p>
            ) : null}
            {proj.target_ecosystem_slugs.length > 0 ? (
              <div className="catalog-card__pills" style={{ marginTop: "0.35rem" }}>
                {proj.target_ecosystem_slugs.slice(0, 3).map((s) => (
                  <StatusPill key={s} tone="info">
                    {s}
                  </StatusPill>
                ))}
              </div>
            ) : null}
            {proj.caution_notes ? (
              <p
                className="catalog-card__sub"
                style={{ color: "var(--color-semantic-warning)", fontSize: "0.8rem" }}
              >
                ⚠ {proj.caution_notes.slice(0, 100)}
              </p>
            ) : null}
          </article>
        ))}
      </div>
      {total > 10 ? (
        <div className="ui-pagination">
          <span className="ui-pagination__summary">
            Página {page} · {total} projetos
          </span>
          <div className="ui-pagination__actions">
            <button
              type="button"
              className="ui-button ui-button--secondary ui-button--sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </button>
            <button
              type="button"
              className="ui-button ui-button--secondary ui-button--sm"
              disabled={page * 10 >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ─── Modeling approaches sub-panel ───────────────────────────────────────────

function ModelingPanel() {
  const [items, setItems] = useState<ModelingApproachRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    ecologyApi
      .listModelingApproaches()
      .then((res) => {
        const rows = Array.isArray(res.data) ? res.data : [];
        setItems(rows);
      })
      .catch((err: unknown) => setError(getApiErrorMessage(err)))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <LoadingBlock label="Carregando abordagens de modelagem..." />;
  if (error) return <ErrorState title="Erro" message={error} />;
  if (items.length === 0)
    return (
      <EmptyState
        icon={<TreeStructure />}
        title="Sem abordagens"
        description="Nenhuma abordagem de modelagem registrada."
      />
    );

  return (
    <div className="catalog-grid">
      {items.map((m) => (
        <article key={m.id} className="catalog-card">
          <div className="catalog-card__pills">
            <StatusPill tone="info">{m.family}</StatusPill>
          </div>
          <h4 className="catalog-card__title">{m.title}</h4>
          {m.primary_use ? (
            <p className="catalog-card__sub">{m.primary_use}</p>
          ) : null}
          {m.description ? (
            <p className="catalog-card__sub" style={{ marginTop: "0.25rem" }}>
              {m.description.length > 140
                ? `${m.description.slice(0, 140)}…`
                : m.description}
            </p>
          ) : null}
          {m.strengths ? (
            <p
              className="catalog-card__sub"
              style={{ color: "var(--color-semantic-success)", fontSize: "0.78rem" }}
            >
              ✓ {m.strengths.slice(0, 80)}
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}

// ─── Coverage sub-panel ───────────────────────────────────────────────────────

function CoveragePanel() {
  const [stats, setStats] = useState<DomainCoverageStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    ecologyApi
      .getCoverage()
      .then((res) => setStats(res.data))
      .catch((err: unknown) => setError(getApiErrorMessage(err)))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <LoadingBlock label="Carregando estatísticas de cobertura..." />;
  if (error) return <ErrorState title="Erro" message={error} />;
  if (!stats) return null;

  const byCategory = stats.byCategory ?? {};

  return (
    <div className="page-stack">
      <div className="coverage-grid">
        {stats.totalFacts !== undefined ? (
          <div className="coverage-stat">
            <span className="coverage-stat__value">{stats.totalFacts}</span>
            <span className="coverage-stat__label">Fatos totais</span>
          </div>
        ) : null}
        {stats.activeFacts !== undefined ? (
          <div className="coverage-stat">
            <span className="coverage-stat__value">{stats.activeFacts}</span>
            <span className="coverage-stat__label">Fatos ativos</span>
          </div>
        ) : null}
        {Object.entries(byCategory).map(([cat, count]) => (
          <div key={cat} className="coverage-stat">
            <span className="coverage-stat__value">{count}</span>
            <span className="coverage-stat__label">{cat}</span>
          </div>
        ))}
      </div>

      {Object.keys(stats).filter((k) => !["totalFacts", "activeFacts", "byCategory"].includes(k)).length > 0 ? (
        <details className="signal-panel technical-details">
          <summary className="technical-details__summary">
            <div>
              <strong>Dados brutos</strong>
              <span>Todos os campos retornados pelo endpoint /coverage.</span>
            </div>
            <BookOpen weight="duotone" />
          </summary>
          <div className="technical-details__content">
            <pre className="context-panel">{JSON.stringify(stats, null, 2)}</pre>
          </div>
        </details>
      ) : null}
    </div>
  );
}

// ─── Main catalog section ─────────────────────────────────────────────────────

export function EcologyCatalogSection() {
  const [activeTab, setActiveTab] = useState<CatalogTab>("ecosystems");

  return (
    <div className="page-stack">
      <section className="signal-panel">
        <div className="signal-panel__header">
          <div>
            <h3>Catálogo ecológico</h3>
            <p>Navegue pelos dados do domínio ecológico: ecossistemas, espécies, fatores e abordagens.</p>
          </div>
        </div>

        <div className="catalog-inner-tabs">
          {CATALOG_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`catalog-inner-tab-btn${activeTab === tab.id ? " is-active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ marginTop: "1rem" }}>
          {activeTab === "ecosystems" && <EcosystemsPanel />}
          {activeTab === "species" && <SpeciesPanel />}
          {activeTab === "abiotic" && <AbioticPanel />}
          {activeTab === "projects" && <ProjectsPanel />}
          {activeTab === "modeling" && <ModelingPanel />}
          {activeTab === "coverage" && <CoveragePanel />}
        </div>
      </section>
    </div>
  );
}
