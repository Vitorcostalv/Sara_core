import { AppError } from "../../core/errors/app-error";
import { ecosystemReportService, type EcosystemReportInput } from "./ecosystem-report.service";
import { biomePresetService } from "./simulation/biome-preset.service";
import { invasiveScenarioService, INVADER_PROFILES } from "./simulation/invasive-scenario.service";

function normalize(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/)
    .map(word => word === "leoes" ? "leao" : word.endsWith("s") ? word.slice(0, -1) : word).join(" ");
}

export function resolveSimulationIntent(prompt: string):
  { kind: "ecosystem" } | { kind: "invasive"; speciesText: string; locationSlug: string; locationText: string } {
  const text = prompt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const withoutNegation = text.replace(/\bsem\s+(?:(?:nenhuma?s?|especies?)\s+)*(?:invas(?:ao|oes|or(?:a|es|as)?)|introducao)\b/g, "");
  if (!/\b(?:inva[sz](?:ao|oes)|invasor(?:a|es|as)?|introdu(?:cao|coes|za|zir|zid[oa]s?|zindo)|coloque|insira|solte)\b/.test(withoutNegation)) {
    return { kind: "ecosystem" };
  }
  const normalized = ` ${normalize(prompt)} `;
  const matches: { profile: typeof INVADER_PROFILES[number]; start: number; end: number }[] = [];
  for (const profile of INVADER_PROFILES) for (const keyword of profile.keywords) {
    const needle = ` ${normalize(keyword)} `;
    for (let start = normalized.indexOf(needle); start >= 0; start = normalized.indexOf(needle, start + 1)) {
      matches.push({ profile, start, end: start + needle.length });
    }
  }
  const candidates = INVADER_PROFILES.filter(profile => matches.some(match => match.profile === profile &&
    !matches.some(other => other.profile !== profile && other.start <= match.start && other.end >= match.end &&
      other.end - other.start > match.end - match.start)));
  // Never silently invent an invader, choose the first of several species, or
  // substitute Cerrado when the destination was not supplied.
  if (candidates.length !== 1) throw new AppError("INVASION_SPECIES_REQUIRED", 422,
    candidates.length ? "Descreva uma espécie introduzida por cenário." : "Informe a espécie da invasão, por exemplo: invasão de javalis no Cerrado.");
  const locationWords = normalized.split("").map((char, index) => matches.some(match => index > match.start && index < match.end - 1) ? " " : char).join("");
  const location = biomePresetService.findByKeyword(locationWords);
  if (!location) throw new AppError("INVASION_LOCATION_REQUIRED", 422,
    "Informe o ambiente da invasão, por exemplo: leões introduzidos na Antártida.");
  return { kind: "invasive", speciesText: candidates[0]!.displayName,
    locationSlug: location.slug, locationText: `${location.preset.displayName}. ${locationWords.trim()}` };
}

export class PromptSimulationService {
  async generate(input: EcosystemReportInput) {
    const intent = resolveSimulationIntent(input.prompt);
    if (intent.kind === "invasive") {
      const result = await invasiveScenarioService.simulate({ ...input, speciesText: intent.speciesText, locationText: intent.locationText });
      return { ...intent, result };
    }
    return { kind: "ecosystem" as const, result: await ecosystemReportService.generate(input) };
  }
}
export const promptSimulationService = new PromptSimulationService();
