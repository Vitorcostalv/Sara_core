import { env } from "../../../config/env";
import { AppError } from "../../../core/errors/app-error";
import { logger } from "../../../logging/logger";
import { createLlmProvider, type LlmGenerateTextOutput } from "../../llm/llm.provider";
import type { GroundingCategory } from "../ecology.schemas";
import {
  ecologicalContextBuilderService,
  type EcologicalBuiltContext,
} from "../grounding/ecological-context-builder.service";
import type { EcologicalQueryType } from "../grounding/ecological-business-rules.service";

const ecoLlmLogger = logger.child({ module: "ecological-llm-service" });

const INSUFFICIENT_GROUNDING_MESSAGE =
  "Não encontrei informação suficiente no banco para responder com segurança sobre esse tema ecológico.";

const SPECULATIVE_DISCLAIMER =
  "[ESPECULATIVO] Esta resposta envolve hipóteses não totalmente cobertas pelos fatos do banco. Trate como exploração, não como verdade científica consolidada.";

const MODELING_DISCLAIMER =
  "[MODELAGEM/IA] Esta resposta refere-se a abordagens computacionais de modelagem ecológica, não a observações primárias de campo.";

export interface EcologicalLlmInput {
  prompt: string;
  ecosystems?: string[];
  categories?: GroundingCategory[];
  maxFacts?: number;
  dryRun?: boolean;
  includeInspection?: boolean;
}

export interface EcologicalLlmResult {
  provider: string;
  model: string;
  answer: string | null;
  dryRun: boolean;
  queryType: EcologicalQueryType;
  contextPreview: string;
  factsUsed: number;
  ecosystemsFound: string[];
  warnings: string[];
  inspection: EcologicalBuiltContext["inspection"];
  groundingCoverage: "sufficient" | "insufficient";
}

function buildSystemPrompt(queryType: EcologicalQueryType): string {
  const base = [
    "You are Sara Core's grounded ecological assistant.",
    "Answer using ONLY the ecological grounded context provided by the backend.",
    "The context comes from the environmental_ecology domain (scientific ecosystem data).",
    "Do not invent species, ecosystems, processes, or metrics outside the provided context.",
    `If the context is insufficient, answer exactly: ${INSUFFICIENT_GROUNDING_MESSAGE}`,
    "Do not use outside knowledge, fill gaps, or speculate beyond the provided facts.",
    "Keep answers concise, factual, and traceable to the provided context.",
    "When citing a fact, include the citation_key if available.",
  ];

  if (queryType === "speculative") {
    base.push(
      "This query is SPECULATIVE. Start your answer with: " + SPECULATIVE_DISCLAIMER,
      "Clearly signal the speculative nature and limit to what the grounded context supports."
    );
  }
  if (queryType === "modeling") {
    base.push(
      "This query is about MODELING/AI. Start with: " + MODELING_DISCLAIMER,
      "Use only facts from 'modeling-approach' and 'reference' categories.",
      "Never treat AI/LLM outputs as primary ecological data."
    );
  }
  if (queryType === "artificial-project") {
    base.push(
      "This query involves artificial ecosystems or projects.",
      "Clearly distinguish artificial/restored from natural ecosystems.",
      "Use facts from 'artificial-project' and 'concept' categories.",
      "Include caution_notes from project records when relevant."
    );
  }
  if (queryType === "comparative") {
    base.push("Compare ecosystems using only the grounded facts provided. Do not extrapolate.");
  }

  return base.join("\n");
}

function buildUserPrompt(userPrompt: string, contextPreview: string): string {
  return ["User request:", userPrompt.trim(), "", "Grounded ecological context:", contextPreview].join("\n");
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export class EcologicalLlmService {
  async generate(input: EcologicalLlmInput): Promise<EcologicalLlmResult> {
    const builtContext = await ecologicalContextBuilderService.buildContext({
      prompt: input.prompt,
      ecosystems: input.ecosystems,
      categories: input.categories,
      maxFacts: input.maxFacts,
      includeInspection: input.includeInspection ?? false,
    });

    const provider = createLlmProvider(env.llmProvider);
    const providerName = provider?.name ?? "disabled";
    const model = provider
      ? env.llmModel || provider.defaultModel
      : env.llmModel || "not-configured";

    const baseResult: Omit<EcologicalLlmResult, "answer"> = {
      provider: providerName,
      model,
      dryRun: input.dryRun ?? false,
      queryType: builtContext.queryType,
      contextPreview: builtContext.contextPreview,
      factsUsed: builtContext.facts.length,
      ecosystemsFound: builtContext.ecosystemsFound,
      warnings: builtContext.coverage.warnings,
      inspection: builtContext.inspection,
      groundingCoverage: builtContext.coverage.sufficient ? "sufficient" : "insufficient",
    };

    // Dry-run: return context without calling LLM
    if (input.dryRun) {
      ecoLlmLogger.info(
        {
          provider: providerName,
          model,
          queryType: builtContext.queryType,
          factsAvailable: builtContext.facts.length,
          ecosystems: builtContext.ecosystemsFound,
        },
        "Ecological LLM dry run — returning grounded context without calling provider"
      );
      return { ...baseResult, answer: null };
    }

    // Insufficient grounding: return safe message without calling LLM
    if (!builtContext.coverage.sufficient) {
      ecoLlmLogger.warn(
        {
          queryType: builtContext.queryType,
          warnings: builtContext.coverage.warnings,
        },
        "Ecological LLM generation short-circuited — insufficient grounding"
      );
      return { ...baseResult, answer: builtContext.coverage.safeMessage ?? INSUFFICIENT_GROUNDING_MESSAGE };
    }

    if (!provider) {
      throw new AppError(
        "LLM_PROVIDER_NOT_CONFIGURED",
        503,
        "LLM provider is disabled. Configure LLM_PROVIDER and credentials."
      );
    }
    if (!env.llmApiKey) {
      throw new AppError(
        "LLM_API_KEY_MISSING",
        503,
        "LLM_API_KEY is missing. Configure provider credentials."
      );
    }

    const systemPrompt = buildSystemPrompt(builtContext.queryType);
    const userPrompt = buildUserPrompt(input.prompt, builtContext.contextPreview);

    const callStart = Date.now();
    let generation: LlmGenerateTextOutput;
    try {
      generation = await provider.generateText({
        systemPrompt,
        userPrompt,
        model,
        apiKey: env.llmApiKey,
        baseUrl: normalizeBaseUrl(env.llmBaseUrl ?? provider.defaultBaseUrl),
        timeoutMs: env.llmTimeoutMs,
      });
    } catch (err) {
      ecoLlmLogger.error({ err }, "Ecological LLM provider call failed");
      if (err instanceof AppError) throw err;
      throw new AppError(
        "LLM_PROVIDER_ERROR",
        502,
        "O provedor LLM retornou um erro inesperado. Verifique as configurações e tente novamente."
      );
    }
    const durationMs = Date.now() - callStart;

    ecoLlmLogger.info(
      {
        provider: provider.name,
        model,
        durationMs,
        queryType: builtContext.queryType,
        factsUsed: builtContext.facts.length,
        ecosystems: builtContext.ecosystemsFound,
        groundingWarnings: builtContext.coverage.warnings,
        responseLength: generation.text?.length ?? 0,
      },
      "Ecological LLM generation completed"
    );

    return { ...baseResult, answer: generation.text };
  }
}

export const ecologicalLlmService = new EcologicalLlmService();
