import { useState } from "react";
import { SlidersHorizontal } from "@phosphor-icons/react";
import type { GenerateLlmRequest, LlmGenerateResult } from "@sara/shared-types";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ErrorState,
  Input,
  PageHeader,
  Section,
  Select,
  StatusPill,
  TextArea
} from "../components/ui";
import { getApiErrorMessage, llmApi } from "../services/api/client";

interface LlmFormState {
  prompt: string;
  ecosystems: string;
  maxFacts: string;
  includeProfile: "true" | "false";
  dryRun: "true" | "false";
}

const initialFormState: LlmFormState = {
  prompt: "Quais ecossistemas estao ativos hoje no projeto?",
  ecosystems: "sara-core,llm-grounding,voice-stt",
  maxFacts: "12",
  includeProfile: "true",
  dryRun: "true"
};

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
    includeProfile: form.includeProfile === "true",
    dryRun: form.dryRun === "true"
  };
}

export function LlmPage() {
  const [form, setForm] = useState<LlmFormState>(initialFormState);
  const [result, setResult] = useState<LlmGenerateResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!form.prompt.trim()) {
      setErrorMessage("Prompt is required.");
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

  return (
    <div className="page-stack">
      <PageHeader
        title="LLM Grounding"
        description="Minimal operational screen to inspect grounded context, warnings and provider answers without redesign work."
        icon={<SlidersHorizontal weight="duotone" />}
        actions={<StatusPill tone="info">POST /api/v1/llm/generate</StatusPill>}
      />

      <Card>
        <CardHeader>
          <CardTitle>Run Grounded Prompt</CardTitle>
        </CardHeader>
        <CardContent className="stack-sm">
          <TextArea
            label="Prompt"
            value={form.prompt}
            onChange={(event) => setForm((current) => ({ ...current, prompt: event.target.value }))}
            hint="Use dryRun first when auditing context quality."
          />

          <div className="form-grid">
            <Input
              label="Ecosystems"
              value={form.ecosystems}
              onChange={(event) => setForm((current) => ({ ...current, ecosystems: event.target.value }))}
              placeholder="sara-core,llm-grounding,voice-stt"
              hint="Comma-separated slugs. Leave empty to scan all ecosystem facts."
            />
            <Input
              label="Max facts"
              value={form.maxFacts}
              onChange={(event) => setForm((current) => ({ ...current, maxFacts: event.target.value }))}
              inputMode="numeric"
            />
            <Select
              label="Include profile"
              value={form.includeProfile}
              onChange={(event) => setForm((current) => ({ ...current, includeProfile: event.target.value as LlmFormState["includeProfile"] }))}
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </Select>
            <Select
              label="Dry run"
              value={form.dryRun}
              onChange={(event) => setForm((current) => ({ ...current, dryRun: event.target.value as LlmFormState["dryRun"] }))}
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </Select>
          </div>

          <div className="form-actions">
            <Button variant="primary" onClick={() => void onSubmit()} disabled={isSubmitting}>
              {isSubmitting ? "Running..." : "Run request"}
            </Button>
            {result ? (
              <StatusPill tone={result.dryRun ? "warning" : "success"}>
                {result.dryRun ? "dryRun" : "provider call"}
              </StatusPill>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {errorMessage ? <ErrorState message={errorMessage} onRetry={() => void onSubmit()} /> : null}

      {result ? (
        <>
          <Section title="Execution Summary" subtitle="Inspect provider, model, warnings and the final answer returned by the backend.">
            <div className="page-columns">
              <Card>
                <CardHeader>
                  <CardTitle>Result</CardTitle>
                </CardHeader>
                <CardContent className="stack-sm">
                  <div className="inline-row">
                    <strong>Provider</strong>
                    <StatusPill tone="info">{result.provider}</StatusPill>
                  </div>
                  <div className="inline-row">
                    <strong>Model</strong>
                    <span className="ui-input-field__hint">{result.model}</span>
                  </div>
                  <div className="inline-row">
                    <strong>Facts used</strong>
                    <span className="ui-input-field__hint">{result.grounding.factCount}</span>
                  </div>
                  <div className="stack-sm">
                    <strong>Answer</strong>
                    <div className="voice-mvp__result-block">
                      <p>{result.answer ?? "No answer returned. Dry run keeps provider output empty."}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Grounding Warnings</CardTitle>
                </CardHeader>
                <CardContent className="stack-sm">
                  {result.grounding.warnings.length === 0 ? (
                    <span className="ui-input-field__hint">No grounding warnings returned.</span>
                  ) : (
                    result.grounding.warnings.map((warning) => (
                      <div key={warning} className="voice-mvp__notice">
                        <span>{warning}</span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </Section>

          <Section title="Context Preview" subtitle="Audit the exact grounded preview assembled by the backend before the provider call.">
            <Card>
              <CardContent>
                <pre className="llm-preview">{result.contextPreview}</pre>
              </CardContent>
            </Card>
          </Section>

          <Section title="Facts Preview" subtitle="Review the facts that actually entered the grounded context.">
            <div className="llm-facts-grid">
              {result.factsPreview.map((fact) => (
                <Card key={fact.id}>
                  <CardHeader>
                    <CardTitle>{fact.key}</CardTitle>
                  </CardHeader>
                  <CardContent className="stack-sm">
                    <StatusPill tone={fact.isImportant ? "warning" : "neutral"}>{fact.category}</StatusPill>
                    <p className="ui-card__description">{fact.valuePreview}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </Section>
        </>
      ) : null}
    </div>
  );
}
