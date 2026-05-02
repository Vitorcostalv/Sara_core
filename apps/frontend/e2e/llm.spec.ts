import { expect, test } from "@playwright/test";
import { fulfillJson, installMockApi } from "./support/api-mocks";

test("LLM: envia prompt em dryRun e exibe answer, warnings, contextPreview e facts", async ({ page }) => {
  let capturedBody: Record<string, unknown> | null = null;

  await installMockApi(page, [
    {
      pathname: "/health",
      handler: (route) =>
        fulfillJson(route, {
          status: "ok",
          service: "sara-core-backend",
          environment: "test",
          timestamp: "2026-05-01T18:00:00.000Z"
        })
    },
    {
      method: "POST",
      pathname: "/llm/generate",
      handler: async (route) => {
        capturedBody = JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>;

        await fulfillJson(route, {
          data: {
            provider: "mock",
            model: "grounded-dryrun",
            answer: "Resumo grounded auditado com sucesso.",
            dryRun: true,
            contextPreview: "Grounding policy...\nContexto montado para auditoria.",
            factsPreview: [
              {
                id: "fact-1",
                key: "ecosystem-summary",
                category: "ecosystem:sara-core",
                isImportant: true,
                valuePreview: "Projeto principal com backend, frontend e grounding."
              }
            ],
            ecosystems: [
              {
                slug: "sara-core",
                factCount: 1,
                facts: [
                  {
                    id: "fact-1",
                    key: "ecosystem-summary",
                    category: "ecosystem:sara-core",
                    isImportant: true,
                    valuePreview: "Projeto principal com backend, frontend e grounding."
                  }
                ]
              }
            ],
            grounding: {
              userId: "local-user",
              profileIncluded: false,
              factCount: 1,
              ecosystemsUsed: ["sara-core"],
              warnings: ["Coverage parcial para voice-stt com maxFacts reduzido."]
            }
          }
        });
      }
    }
  ]);

  await page.goto("/llm");

  await page.getByTestId("llm-prompt-input").fill("Mapeie o contexto grounded desta execucao.");
  await page.getByTestId("llm-maxfacts-input").fill("6");
  await page.getByTestId("llm-include-profile-toggle").click();
  await page.getByTestId("llm-dryrun-toggle").click();

  await expect(page.getByTestId("llm-answer-panel")).toContainText("Resumo grounded auditado com sucesso.");
  await expect(page.getByTestId("llm-answer-panel")).toContainText("Inspecao tecnica");
  await expect(page.getByTestId("llm-warnings-panel")).toContainText("Coverage parcial para voice-stt");

  await expect(page.getByTestId("llm-technical-details")).not.toHaveAttribute("open", "");
  await page.getByTestId("llm-technical-details").locator("summary").click();
  await expect(page.getByTestId("llm-context-preview")).toContainText("Grounding policy...");
  await expect(page.getByTestId("llm-facts-preview")).toContainText("ecosystem-summary");

  expect(capturedBody).not.toBeNull();
  expect(capturedBody?.prompt).toBe("Mapeie o contexto grounded desta execucao.");
  expect(capturedBody?.maxFacts).toBe(6);
  expect(capturedBody?.dryRun).toBe(true);
  expect(capturedBody?.includeProfile).toBe(false);
});

test("LLM: erro 401 mostra mensagem adequada sem vazar detalhe interno", async ({ page }) => {
  await installMockApi(page, [
    {
      pathname: "/health",
      handler: (route) =>
        fulfillJson(route, {
          status: "ok",
          service: "sara-core-backend",
          environment: "test",
          timestamp: "2026-05-01T18:00:00.000Z"
        })
    },
    {
      method: "POST",
      pathname: "/llm/generate",
      handler: (route) =>
        fulfillJson(
          route,
          {
            error: {
              code: "AUTH_UNAUTHORIZED",
              message: "A valid API key is required for this endpoint."
            }
          },
          {
            status: 401
          }
        )
    }
  ]);

  await page.goto("/llm");
  await page.getByTestId("llm-submit").click();

  await expect(page.getByTestId("llm-error")).toContainText(
    "Acesso negado pela API. Verifique a chave de integracao configurada para este ambiente."
  );
});

test("LLM: erro 429 respeita retry-after no feedback visual", async ({ page }) => {
  await installMockApi(page, [
    {
      pathname: "/health",
      handler: (route) =>
        fulfillJson(route, {
          status: "ok",
          service: "sara-core-backend",
          environment: "test",
          timestamp: "2026-05-01T18:00:00.000Z"
        })
    },
    {
      method: "POST",
      pathname: "/llm/generate",
      handler: (route) =>
        fulfillJson(
          route,
          {
            error: {
              code: "RATE_LIMITED",
              message: "Too many requests for this endpoint. Retry after the current rate-limit window."
            }
          },
          {
            status: 429,
            headers: {
              "Retry-After": "9"
            }
          }
        )
    }
  ]);

  await page.goto("/llm");
  await page.getByTestId("llm-submit").click();

  await expect(page.getByTestId("llm-error")).toContainText(
    "Limite temporario atingido. Tente novamente em cerca de 9s."
  );
});
