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

test("LlmContextBuilderService keeps only ecological ecosystem keys and concept facts", async () => {
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
            key: "definicao",
            value: "Manguezal e um ecossistema costeiro de transicao.\nEle depende da dinamica das mares.",
            category: "ecosystem:manguezal",
            isImportant: true,
          }),
          createFact({
            id: "fact-2",
            key: "api.voice-endpoint",
            value: "Ignore me",
            category: "ecosystem:manguezal",
          }),
          createFact({
            id: "fact-3",
            key: "ecossistema.definicao",
            value: "Ecossistemas unem fatores bioticos e abioticos.",
            category: "concept",
            isImportant: true,
          }),
        ]),
    }
  );

  const result = await service.buildContext({
    userId: "local-user",
    ecosystems: ["manguezal"],
    maxFacts: 10,
    includeProfile: true,
  });

  assert.equal(result.ecosystems.length, 1);
  assert.equal(result.ecosystems[0]?.slug, "manguezal");
  assert.equal(result.factsPreview.length, 2);
  assert.match(result.factsPreview[0]?.valuePreview ?? "", /Manguezal e um ecossistema costeiro de transicao\./);
  assert.ok(result.grounding.warnings.some((warning) => warning.includes("ignored")));
});

test("LlmContextBuilderService keeps one fact per requested ecological ecosystem before filling the remaining limit", async () => {
  const service = new LlmContextBuilderService(
    {
      ensureLocalProfile: () => Promise.resolve(profile),
      findById: () => Promise.resolve(profile),
    },
    {
      listGroundingFacts: () =>
        Promise.resolve([
          createFact({
            id: "fact-cerrado",
            key: "definicao",
            value: "Cerrado e um ecossistema savanico.",
            category: "ecosystem:cerrado",
            isImportant: true,
          }),
          createFact({
            id: "fact-manguezal",
            key: "definicao",
            value: "Manguezal e um ecossistema costeiro de transicao.",
            category: "ecosystem:manguezal",
            isImportant: true,
          }),
          createFact({
            id: "fact-oceano",
            key: "definicao",
            value: "Oceano e o grande ecossistema marinho global.",
            category: "ecosystem:oceano",
            isImportant: true,
          }),
          createFact({
            id: "fact-rio",
            key: "definicao",
            value: "Rio e um ecossistema lotico.",
            category: "ecosystem:rio",
            isImportant: true,
          }),
          createFact({
            id: "fact-concept",
            key: "ecossistema.classificacao",
            value: "Ecossistemas podem ser terrestres, aquaticos e de transicao.",
            category: "concept",
            isImportant: true,
          }),
        ]),
    }
  );

  const result = await service.buildContext({
    userId: "local-user",
    ecosystems: ["cerrado", "manguezal", "oceano", "rio"],
    maxFacts: 4,
    includeProfile: true,
  });

  assert.deepEqual(
    result.ecosystems.map((ecosystem) => ecosystem.slug),
    ["cerrado", "manguezal", "oceano", "rio"]
  );
  assert.equal(result.grounding.factCount, 4);
  assert.equal(
    result.grounding.warnings.some((warning) => warning.includes("omitted from the final context")),
    false
  );
});

test("LlmContextBuilderService warns predictably when maxFacts cannot cover all requested ecological ecosystems", async () => {
  const service = new LlmContextBuilderService(
    {
      ensureLocalProfile: () => Promise.resolve(profile),
      findById: () => Promise.resolve(profile),
    },
    {
      listGroundingFacts: () =>
        Promise.resolve([
          createFact({
            id: "fact-cerrado",
            key: "definicao",
            value: "Cerrado e um ecossistema savanico.",
            category: "ecosystem:cerrado",
            isImportant: true,
          }),
          createFact({
            id: "fact-manguezal",
            key: "definicao",
            value: "Manguezal e um ecossistema costeiro.",
            category: "ecosystem:manguezal",
            isImportant: true,
          }),
          createFact({
            id: "fact-oceano",
            key: "definicao",
            value: "Oceano e o grande ecossistema marinho global.",
            category: "ecosystem:oceano",
            isImportant: true,
          }),
        ]),
    }
  );

  const result = await service.buildContext({
    userId: "local-user",
    ecosystems: ["cerrado", "manguezal", "oceano"],
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
