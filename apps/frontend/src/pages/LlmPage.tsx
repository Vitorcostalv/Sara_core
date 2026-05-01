import { useState } from "react";
import {
  BracketsCurly,
  Diamond,
  Gauge,
  SlidersHorizontal,
  Sparkle,
  WarningCircle
} from "@phosphor-icons/react";
import type { GenerateLlmRequest, LlmGenerateResult } from "@sara/shared-types";
import {
  Button,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  StatusPill,
  TextArea
} from "../components/ui";
import { getApiErrorMessage, llmApi } from "../services/api/client";

interface LlmFormState {
  prompt: string;
  ecosystems: string;
  maxFacts: string;
  includeProfile: boolean;
  dryRun: boolean;
}

const initialFormState: LlmFormState = {
  prompt: "Quais ecossistemas estao ativos hoje no projeto e como eles se conectam no fluxo principal?",
  ecosystems: "sara-core,llm-grounding,voice-stt,environment",
  maxFacts: "12",
  includeProfile: true,
  dryRun: true
};

const suggestedEcosystems = ["sara-core", "llm-grounding", "voice-stt", "environment"];

function parseEcosystems(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter((item) => item.length > 0)
    )
  );
}

function buildRequestPayload(form: LlmFormState): GenerateLlmRequest {
  const parsedMaxFacts = Number.parseInt(form.maxFacts, 10);

  return {
    prompt: form.prompt.trim(),
    ecosystems: parseEcosystems(form.ecosystems),
    maxFacts: Number.isFinite(parsedMaxFacts) ? parsedMaxFacts : 12,
    includeProfile: form.includeProfile,
    dryRun: form.dryRun
  };
}

function toggleSuggestedEcosystem(currentValue: string, ecosystem: string) {
  const next = parseEcosystems(currentValue);

  if (next.includes(ecosystem)) {
    return next.filter((item) => item !== ecosystem).join(",");
  }

  return [...next, ecosystem].join(",");
}

export function LlmPage() {
  const [form, setForm] = useState<LlmFormState>(initialFormState);
  const [result, setResult] = useState<LlmGenerateResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!form.prompt.trim()) {
      setErrorMessage("Escreva um prompt antes de executar a validacao.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await llmApi.generate(buildRequestPayload(form));
      setResult(response.data);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const parsedEcosystems = parseEcosystems(form.ecosystems);

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Grounding bench"
        title="LLM Inspector"
        description="Uma bancada séria de validacao grounded: prompt, filtros, contexto montado, warnings e resposta final organizados como artefatos auditaveis."
        icon={<SlidersHorizontal weight="duotone" />}
        actions={<StatusPill tone="info">POST /api/v1/llm/generate</StatusPill>}
      />

      <section className="llm-hero">
        <div className="llm-hero__lead">
          <span className="llm-hero__eyebrow">Prompt orchestration</span>
          <h3>Inspecione a cadeia inteira antes de confiar na resposta.</h3>
          <p>
            A tela agora separa claramente entrada, grounding e saída. Dry run continua sendo o modo preferido
            para auditoria de contexto antes de qualquer chamada externa.
          </p>
        </div>

        <div className="llm-hero__stats">
          <div className="signal-metric">
            <span>Mode</span>
            <strong>{form.dryRun ? "Dry run" : "Provider call"}</strong>
            <small>{form.includeProfile ? "perfil incluido" : "sem perfil"}</small>
          </div>
          <div className="signal-metric">
            <span>Ecosystems</span>
            <strong>{parsedEcosystems.length}</strong>
            <small>slugs selecionados</small>
          </div>
          <div className="signal-metric">
            <span>Fact cap</span>
            <strong>{form.maxFacts}</strong>
            <small>limite atual de facts</small>
          </div>
        </div>
      </section>

      <div className="llm-layout">
        <section className="signal-panel signal-panel--llm">
          <div className="signal-panel__header">
            <div>
              <span className="signal-panel__eyebrow">Request composer</span>
              <h3>Grounded prompt</h3>
              <p>Monte a chamada com foco em clareza operacional, não em adivinhação do provider.</p>
            </div>
            {result ? (
              <StatusPill tone={result.dryRun ? "warning" : "success"}>
                {result.dryRun ? "Dry run" : "Provider"}
              </StatusPill>
            ) : null}
          </div>

          <TextArea
            label="Prompt"
            value={form.prompt}
            onChange={(event) => setForm((current) => ({ ...current, prompt: event.target.value }))}
            hint="Use perguntas verificaveis e rastreaveis pelo banco."
          />

          <div className="llm-chip-row">
            {suggestedEcosystems.map((ecosystem) => {
              const isActive = parsedEcosystems.includes(ecosystem);
              return (
                <button
                  key={ecosystem}
                  type="button"
                  className={`llm-chip${isActive ? " is-active" : ""}`}
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      ecosystems: toggleSuggestedEcosystem(current.ecosystems, ecosystem)
                    }))
                  }
                >
                  {ecosystem}
                </button>
              );
            })}
          </div>

          <div className="llm-form-grid">
            <Input
              label="Ecosystems"
              value={form.ecosystems}
              onChange={(event) => setForm((current) => ({ ...current, ecosystems: event.target.value }))}
              placeholder="sara-core,llm-grounding,voice-stt"
              hint="Lista separada por virgulas."
            />
            <Input
              label="Max facts"
              value={form.maxFacts}
              onChange={(event) => setForm((current) => ({ ...current, maxFacts: event.target.value }))}
              inputMode="numeric"
            />
          </div>

          <div className="toggle-grid">
            <button
              type="button"
              className={`toggle-card${form.includeProfile ? " is-active" : ""}`}
              onClick={() => setForm((current) => ({ ...current, includeProfile: !current.includeProfile }))}
            >
              <Diamond weight="duotone" />
              <div>
                <strong>Include profile</strong>
                <span>Acopla `user_profile` ao contexto grounded.</span>
              </div>
            </button>

            <button
              type="button"
              className={`toggle-card${form.dryRun ? " is-active" : ""}`}
              onClick={() => setForm((current) => ({ ...current, dryRun: !current.dryRun }))}
            >
              <Gauge weight="duotone" />
              <div>
                <strong>Dry run</strong>
                <span>Inspeciona contexto sem chamar provider externo.</span>
              </div>
            </button>
          </div>

          <div className="form-actions">
            <Button variant="primary" onClick={() => void onSubmit()} disabled={isSubmitting}>
              {isSubmitting ? "Executando..." : "Executar validacao"}
            </Button>
          </div>
        </section>

        <section className="signal-panel signal-panel--secondary">
          <div className="signal-panel__header">
            <div>
              <span className="signal-panel__eyebrow">Request summary</span>
              <h3>Envelope atual</h3>
              <p>Visao rapida do que sera enviado sem abrir a resposta completa.</p>
            </div>
          </div>

          <div className="summary-list">
            <div>
              <strong>Prompt length</strong>
              <span>{form.prompt.trim().length} caracteres</span>
            </div>
            <div>
              <strong>Ecosystems</strong>
              <span>{parsedEcosystems.length > 0 ? parsedEcosystems.join(", ") : "todos os disponiveis"}</span>
            </div>
            <div>
              <strong>Profile</strong>
              <span>{form.includeProfile ? "incluido" : "ignorado"}</span>
            </div>
            <div>
              <strong>Execution</strong>
              <span>{form.dryRun ? "somente contexto" : "contexto + provider"}</span>
            </div>
          </div>
        </section>
      </div>

      {errorMessage ? <ErrorState title="Falha ao executar a validacao grounded" message={errorMessage} onRetry={() => void onSubmit()} /> : null}

      {!result && !errorMessage ? (
        <EmptyState
          icon={<BracketsCurly weight="duotone" />}
          title="Nenhuma execucao ainda"
          description="Monte o request, rode em dry run e use a resposta como base para validar o comportamento grounded."
          actionLabel="Executar agora"
          onAction={() => void onSubmit()}
        />
      ) : null}

      {result ? (
        <>
          <div className="llm-results-grid">
            <section className="signal-panel">
              <div className="signal-panel__header">
                <div>
                  <span className="signal-panel__eyebrow">Response</span>
                  <h3>Answer surface</h3>
                </div>
                <StatusPill tone={result.answer ? "success" : "warning"}>
                  {result.answer ? "Answer ready" : "Sem answer"}
                </StatusPill>
              </div>
              <article className="answer-card">
                <div className="answer-card__meta">
                  <StatusPill tone="info">{result.provider}</StatusPill>
                  <StatusPill tone="neutral">{result.model}</StatusPill>
                </div>
                <p>{result.answer ?? "Nenhuma resposta final retornada. Em dry run isso e esperado."}</p>
              </article>
            </section>

            <section className="signal-panel">
              <div className="signal-panel__header">
                <div>
                  <span className="signal-panel__eyebrow">Grounding health</span>
                  <h3>Warnings and coverage</h3>
                </div>
                <StatusPill tone={result.grounding.warnings.length > 0 ? "warning" : "success"}>
                  {result.grounding.warnings.length > 0 ? "Atencao" : "Limpo"}
                </StatusPill>
              </div>

              <div className="summary-list">
                <div>
                  <strong>Facts used</strong>
                  <span>{result.grounding.factCount}</span>
                </div>
                <div>
                  <strong>Ecosystems used</strong>
                  <span>{result.grounding.ecosystemsUsed.join(", ") || "nenhum"}</span>
                </div>
              </div>

              {result.grounding.warnings.length === 0 ? (
                <div className="signal-message signal-message--success">
                  <Sparkle weight="duotone" />
                  <div>
                    <strong>Sem warnings de grounding</strong>
                    <span>O backend montou o contexto sem sinalizar cobertura insuficiente.</span>
                  </div>
                </div>
              ) : (
                <div className="stack-sm">
                  {result.grounding.warnings.map((warning) => (
                    <div key={warning} className="signal-message signal-message--warning">
                      <WarningCircle weight="duotone" />
                      <div>
                        <strong>Warning</strong>
                        <span>{warning}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <section className="signal-panel">
            <div className="signal-panel__header">
              <div>
                <span className="signal-panel__eyebrow">Context assembly</span>
                <h3>Context preview</h3>
                <p>Visualizacao textual exata do contexto que o backend montou antes da chamada ao provider.</p>
              </div>
            </div>
            <pre className="context-panel">{result.contextPreview}</pre>
          </section>

          <section className="signal-panel">
            <div className="signal-panel__header">
              <div>
                <span className="signal-panel__eyebrow">Fact ingress</span>
                <h3>Facts preview</h3>
                <p>Os fatos abaixo representam o subconjunto real que entrou no grounding final.</p>
              </div>
            </div>
            <div className="fact-preview-grid">
              {result.factsPreview.map((fact) => (
                <article key={fact.id} className="fact-card">
                  <div className="fact-card__header">
                    <strong>{fact.key}</strong>
                    <StatusPill tone={fact.isImportant ? "warning" : "neutral"}>
                      {fact.isImportant ? "important" : "fact"}
                    </StatusPill>
                  </div>
                  <span className="fact-card__category">{fact.category}</span>
                  <p>{fact.valuePreview}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="signal-panel">
            <div className="signal-panel__header">
              <div>
                <span className="signal-panel__eyebrow">Ecosystem coverage</span>
                <h3>Grouped by slug</h3>
              </div>
            </div>
            <div className="ecosystem-grid">
              {result.ecosystems.map((ecosystem) => (
                <article key={ecosystem.slug} className="ecosystem-card">
                  <div className="ecosystem-card__header">
                    <strong>{ecosystem.slug}</strong>
                    <StatusPill tone="info">{ecosystem.factCount} facts</StatusPill>
                  </div>
                  <ul>
                    {ecosystem.facts.map((fact) => (
                      <li key={fact.id}>
                        <span>{fact.key}</span>
                        <small>{fact.valuePreview}</small>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
