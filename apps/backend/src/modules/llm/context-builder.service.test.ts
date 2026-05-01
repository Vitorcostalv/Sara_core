import assert from "node:assert/strict";
import test from "node:test";
import type { Fact, UserProfile } from "@sara/shared-types";
import { LlmContextBuilderService } from "./context-builder.service";

const profile: UserProfile = {
  id: "local-user",
  displayName: "Local User",
  preferredName: "Local User",
  fullName: "Local User",
  email: null,
  locale: "pt-BR",
  timezone: "America/Sao_Paulo",
  birthDate: null,
  createdAt: "2026-04-03T00:00:00.000Z",
  updatedAt: "2026-04-03T00:00:00.000Z",
};

function createFact(partial: Partial<Fact> & Pick<Fact, "id" | "key" | "value" | "category">): Fact {
  return {
    id: partial.id,
    userId: partial.userId ?? "local-user",
    key: partial.key,
    value: partial.value,
    category: partial.category,
    isImportant: partial.isImportant ?? false,
    createdAt: partial.createdAt ?? "2026-04-03T00:00:00.000Z",
    updatedAt: partial.updatedAt ?? "2026-04-03T00:00:00.000Z",
  };
}

test("LlmContextBuilderService keeps only normalized ecosystem/global facts and sanitizes previews", async () => {
  const service = new LlmContextBuilderService(
    {
      ensureLocalProfile: () => Promise.resolve(profile),
      findById: () => Promise.resolve(profile),
    },
    {
      listGroundingFacts: () =>
        Promise.resolve([
          createFact({
            id: "fact-1",
            key: "identity.summary",
            value: "Sara Core   is local.\nIt must stay grounded.",
            category: "ecosystem:sara-core",
            isImportant: true,
          }),
          createFact({
            id: "fact-2",
            key: "bad key",
            value: "Ignore me",
            category: "ecosystem:sara-core",
          }),
          createFact({
            id: "fact-3",
            key: "engineering.change-policy",
            value: "Evolve incrementally.",
            category: "preferences",
            isImportant: true,
          }),
        ]),
    }
  );

  const result = await service.buildContext({
    userId: "local-user",
    ecosystems: ["sara-core"],
    maxFacts: 10,
    includeProfile: true,
  });

  assert.equal(result.ecosystems.length, 1);
  assert.equal(result.ecosystems[0]?.slug, "sara-core");
  assert.equal(result.factsPreview.length, 2);
  assert.match(result.factsPreview[0]?.valuePreview ?? "", /Sara Core is local\. It must stay grounded\./);
  assert.ok(result.grounding.warnings.some((warning) => warning.includes("ignored")));
});

test("LlmContextBuilderService keeps one fact per requested ecosystem before filling the remaining limit", async () => {
  const service = new LlmContextBuilderService(
    {
      ensureLocalProfile: () => Promise.resolve(profile),
      findById: () => Promise.resolve(profile),
    },
    {
      listGroundingFacts: () =>
        Promise.resolve([
          createFact({
            id: "fact-frontend",
            key: "scope.current-navigation",
            value: "Frontend stays focused on operational validation.",
            category: "ecosystem:frontend",
            isImportant: true,
          }),
          createFact({
            id: "fact-llm",
            key: "api.llm-generate",
            value: "The LLM endpoint is POST /api/v1/llm/generate.",
            category: "ecosystem:llm-grounding",
            isImportant: true,
          }),
          createFact({
            id: "fact-sara",
            key: "identity.summary",
            value: "Sara Core is an offline-first assistant platform.",
            category: "ecosystem:sara-core",
            isImportant: true,
          }),
          createFact({
            id: "fact-voice",
            key: "api.voice-endpoint",
            value: "Voice uses POST /api/v1/voice/interactions.",
            category: "ecosystem:voice-stt",
            isImportant: true,
          }),
          createFact({
            id: "fact-pref",
            key: "engineering.change-policy",
            value: "Evolve incrementally without recreating architecture.",
            category: "preferences",
            isImportant: true,
          }),
        ]),
    }
  );

  const result = await service.buildContext({
    userId: "local-user",
    ecosystems: ["frontend", "llm-grounding", "sara-core", "voice-stt"],
    maxFacts: 4,
    includeProfile: true,
  });

  assert.deepEqual(
    result.ecosystems.map((ecosystem) => ecosystem.slug),
    ["frontend", "llm-grounding", "sara-core", "voice-stt"]
  );
  assert.equal(result.grounding.factCount, 4);
  assert.equal(
    result.grounding.warnings.some((warning) => warning.includes("omitted from the final context")),
    false
  );
});

test("LlmContextBuilderService warns predictably when maxFacts cannot cover all requested ecosystems", async () => {
  const service = new LlmContextBuilderService(
    {
      ensureLocalProfile: () => Promise.resolve(profile),
      findById: () => Promise.resolve(profile),
    },
    {
      listGroundingFacts: () =>
        Promise.resolve([
          createFact({
            id: "fact-frontend",
            key: "scope.current-navigation",
            value: "Frontend stays focused on operational validation.",
            category: "ecosystem:frontend",
            isImportant: true,
          }),
          createFact({
            id: "fact-llm",
            key: "api.llm-generate",
            value: "The LLM endpoint is POST /api/v1/llm/generate.",
            category: "ecosystem:llm-grounding",
            isImportant: true,
          }),
          createFact({
            id: "fact-sara",
            key: "identity.summary",
            value: "Sara Core is an offline-first assistant platform.",
            category: "ecosystem:sara-core",
            isImportant: true,
          }),
        ]),
    }
  );

  const result = await service.buildContext({
    userId: "local-user",
    ecosystems: ["frontend", "llm-grounding", "sara-core"],
    maxFacts: 2,
    includeProfile: true,
  });

  assert.equal(result.ecosystems.length, 2);
  assert.ok(
    result.grounding.warnings.some((warning) =>
      warning.includes("maxFacts=2 is lower than the number of requested ecosystems with available facts (3)")
    )
  );
});
