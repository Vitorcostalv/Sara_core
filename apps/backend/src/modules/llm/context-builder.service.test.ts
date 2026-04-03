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
  updatedAt: "2026-04-03T00:00:00.000Z"
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
    updatedAt: partial.updatedAt ?? "2026-04-03T00:00:00.000Z"
  };
}

test("LlmContextBuilderService keeps only normalized ecosystem/global facts and sanitizes previews", () => {
  const service = new LlmContextBuilderService(
    {
      ensureLocalProfile: () => profile,
      findById: () => profile
    },
    {
      listGroundingFacts: () => [
        createFact({
          id: "fact-1",
          key: "identity.summary",
          value: "Sara Core   is local.\nIt must stay grounded.",
          category: "ecosystem:sara-core",
          isImportant: true
        }),
        createFact({
          id: "fact-2",
          key: "bad key",
          value: "Ignore me",
          category: "ecosystem:sara-core"
        }),
        createFact({
          id: "fact-3",
          key: "engineering.change-policy",
          value: "Evolve incrementally.",
          category: "preferences",
          isImportant: true
        })
      ]
    }
  );

  const result = service.buildContext({
    userId: "local-user",
    ecosystems: ["sara-core"],
    maxFacts: 10,
    includeProfile: true
  });

  assert.equal(result.ecosystems.length, 1);
  assert.equal(result.ecosystems[0]?.slug, "sara-core");
  assert.equal(result.factsPreview.length, 2);
  assert.match(result.factsPreview[0]?.valuePreview ?? "", /Sara Core is local\. It must stay grounded\./);
  assert.ok(result.grounding.warnings.some((warning) => warning.includes("ignored")));
});
