import { useState } from "react";
import {
  BracketsCurly,
  Diamond,
  CaretDown,
  Flask,
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
  prompt: "Quais sao as principais caracteristicas do manguezal e como ele se diferencia de um recife de coral?",
  ecosystems: "manguezal,recife-de-coral",
  maxFacts: "12",
  includeProfile: true,
  dryRun: true
};

const suggestedEcosystems = [
  "floresta-tropical",
  "manguezal",
  "cerrado",
  "caatinga",
  "rio",
  "lago",
  "oceano",
  "recife-de-coral"
];

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
  const [lastSubmittedDryRun, setLastSubmittedDryRun] = useState(initialFormState.dryRun);

  const onSubmit = async (dryRun: boolean) => {
    if (!form.prompt.trim()) {
      setErrorMessage("Escreva uma pergunta antes de continuar.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setResult(null);
    setLastSubmittedDryRun(dryRun);

    try {
      const response = await llmApi.generate(
        buildRequestPayload({
          ...form,
          dryRun
        })
      );
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
        title="LLM"
        description="Envie uma pergunta e escolha entre inspecionar o contexto ou gerar a resposta final."
        icon={<SlidersHorizontal weight="duotone" />}
      />

      <div className="llm-layout">
        <section className="signal-panel signal-panel--llm" data-testid="llm-request-panel">
          <div className="signal-panel__header">
            <div>
              <h3>Executar teste</h3>
              <p>Preencha a pergunta e escolha se voce quer inspecionar o contexto ou gerar a resposta.</p>
            </div>
            {result ? (
              <StatusPill tone={result.dryRun ? "warning" : "success"}>
                {result.dryRun ? "Inspecao tecnica" : "Resposta final"}
              </StatusPill>
            ) : null}
          </div>

          <TextArea
            label="Prompt"
            value={form.prompt}
            onChange={(event) => setForm((current) => ({ ...current, prompt: event.target.value }))}
            data-testid="llm-prompt-input"
          />

          <div className="llm-chip-row">
            {suggestedEcosystems.map((ecosystem) => {
              const isActive = parsedEcosystems.includes(ecosystem);
              return (
                <button
                  key={ecosystem}
                  type="button"
                  className={`llm-chip${isActive ? " is-active" : ""}`}
                  data-testid={`llm-ecosystem-chip-${ecosystem}`}
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
              placeholder="manguezal,recife-de-coral"
              data-testid="llm-ecosystems-input"
            />
            <Input
              label="Max facts"
              value={form.maxFacts}
              onChange={(event) => setForm((current) => ({ ...current, maxFacts: event.target.value }))}
              inputMode="numeric"
              data-testid="llm-maxfacts-input"
            />
          </div>

          <div className="toggle-grid">
            <button
              type="button"
              className={`toggle-card${form.includeProfile ? " is-active" : ""}`}
              data-testid="llm-include-profile-toggle"
              onClick={() => setForm((current) => ({ ...current, includeProfile: !current.includeProfile }))}
            >
              <Diamond weight="duotone" />
              <div>
                <strong>Perfil</strong>
                <span>Inclui dados do perfil na montagem do contexto.</span>
              </div>
            </button>
          </div>

          <div className="form-actions">
            <Button
              variant="secondary"
              onClick={() => void onSubmit(true)}
              disabled={isSubmitting}
              data-testid="llm-dryrun-toggle"
            >
              <Flask weight="duotone" />
              {isSubmitting ? "Executando..." : "Inspecionar contexto"}
            </Button>
            <Button variant="primary" onClick={() => void onSubmit(false)} disabled={isSubmitting} data-testid="llm-submit">
              <Sparkle weight="duotone" />
              {isSubmitting ? "Executando..." : "Gerar resposta"}
            </Button>
          </div>
        </section>
      </div>

      {errorMessage ? (
        <div data-testid="llm-error">
          <ErrorState
            title="Falha ao executar"
            message={errorMessage}
            onRetry={() => void onSubmit(lastSubmittedDryRun)}
          />
        </div>
      ) : null}

      {!result && !errorMessage ? (
        <EmptyState
          icon={<BracketsCurly weight="duotone" />}
          title="Nenhum resultado ainda"
          description="Execute uma inspecao tecnica ou gere a resposta final para ver o resultado aqui."
          actionLabel="Inspecionar contexto"
          onAction={() => void onSubmit(true)}
        />
      ) : null}

      {result ? (
        <>
          <div className="llm-results-grid">
            <section className="signal-panel" data-testid="llm-answer-panel">
              <div className="signal-panel__header">
                <div>
                  <h3>{result.dryRun ? "Inspecao tecnica" : "Resposta"}</h3>
                  <p>
                    {result.dryRun
                      ? "Nenhuma resposta final foi gerada. Revise o contexto antes de seguir."
                      : "Resposta principal retornada pelo fluxo configurado."}
                  </p>
                </div>
                <StatusPill tone={result.dryRun ? "warning" : result.answer ? "success" : "warning"}>
                  {result.dryRun ? "Modo tecnico" : result.answer ? "Disponivel" : "Sem resposta"}
                </StatusPill>
              </div>
              <article className="answer-card">
                <div className="answer-card__meta">
                  <StatusPill tone="info">{result.provider}</StatusPill>
                  <StatusPill tone="neutral">{result.model}</StatusPill>
                </div>
                <p>
                  {result.answer ??
                    (result.dryRun
                      ? "A inspecao foi concluida. Abra os detalhes tecnicos se quiser revisar o grounding."
                      : "Nenhuma resposta final foi retornada nesta tentativa.")}
                </p>
              </article>
            </section>

            <section className="signal-panel" data-testid="llm-warnings-panel">
              <div className="signal-panel__header">
                <div>
                  <h3>Avisos</h3>
                  <p>Use esta area para conferir cobertura e observacoes do contexto.</p>
                </div>
                <StatusPill tone={result.grounding.warnings.length > 0 ? "warning" : "success"}>
                  {result.grounding.warnings.length > 0 ? "Atencao" : "Tudo certo"}
                </StatusPill>
              </div>

              <div className="summary-list">
                <div>
                  <strong>Fatos usados</strong>
                  <span>{result.grounding.factCount}</span>
                </div>
                <div>
                  <strong>Contextos</strong>
                  <span>{result.grounding.ecosystemsUsed.join(", ") || "nenhum"}</span>
                </div>
              </div>

              {result.grounding.warnings.length === 0 ? (
                <div className="signal-message signal-message--success">
                  <Sparkle weight="duotone" />
                  <div>
                    <strong>Sem avisos</strong>
                    <span>O contexto foi montado sem alertas adicionais.</span>
                  </div>
                </div>
              ) : (
                <div className="stack-sm">
                  {result.grounding.warnings.map((warning) => (
                    <div key={warning} className="signal-message signal-message--warning">
                      <WarningCircle weight="duotone" />
                      <div>
                        <strong>Aviso</strong>
                        <span>{warning}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <details className="signal-panel technical-details" data-testid="llm-technical-details">
            <summary className="technical-details__summary">
              <div>
                <strong>Detalhes tecnicos</strong>
                <span>Abra para revisar contexto, fatos e agrupamentos usados nesta execucao.</span>
              </div>
              <CaretDown weight="bold" />
            </summary>

            <div className="stack-lg technical-details__content">
              <section>
                <div className="signal-panel__header">
                  <div>
                    <h3>Contexto usado</h3>
                  </div>
                </div>
                <pre className="context-panel" data-testid="llm-context-preview">{result.contextPreview}</pre>
              </section>

              <section>
                <div className="signal-panel__header">
                  <div>
                    <h3>Fatos selecionados</h3>
                  </div>
                </div>
                <div className="fact-preview-grid" data-testid="llm-facts-preview">
                  {result.factsPreview.map((fact) => (
                    <article key={fact.id} className="fact-card">
                      <div className="fact-card__header">
                        <strong>{fact.key}</strong>
                        <StatusPill tone={fact.isImportant ? "warning" : "neutral"}>
                          {fact.isImportant ? "Importante" : "Fato"}
                        </StatusPill>
                      </div>
                      <span className="fact-card__category">{fact.category}</span>
                      <p>{fact.valuePreview}</p>
                    </article>
                  ))}
                </div>
              </section>

              <section>
                <div className="signal-panel__header">
                  <div>
                    <h3>Grupos por ecosystem</h3>
                  </div>
                </div>
                <div className="ecosystem-grid" data-testid="llm-ecosystem-grid">
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
            </div>
          </details>
        </>
      ) : null}
    </div>
  );
}
