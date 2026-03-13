import { colors } from "./colors";
import { tokens } from "./tokens";

type Primitive = string | number;
type FlattenMap = Record<string, Primitive>;

function flatten(prefix: string, value: unknown, out: FlattenMap): FlattenMap {
  if (typeof value === "string" || typeof value === "number") {
    out[prefix] = value;
    return out;
  }

  if (!value || typeof value !== "object") {
    return out;
  }

  for (const [key, nested] of Object.entries(value)) {
    flatten(`${prefix}-${key}`, nested, out);
  }

  return out;
}

function toCssVariables(): Record<string, string> {
  const map: Record<string, string> = {};
  const flattenedColors = flatten("color", colors, {});
  const flattenedTokens = flatten("token", tokens, {});

  for (const [key, value] of Object.entries({ ...flattenedColors, ...flattenedTokens })) {
    map[`--${key}`] = String(value);
  }

  return map;
}

export const theme = { colors, tokens } as const;

export function injectThemeVariables(): void {
  if (typeof document === "undefined") {
    return;
  }

  const styleId = "sara-core-theme-variables";

  if (document.getElementById(styleId)) {
    return;
  }

  const style = document.createElement("style");
  style.id = styleId;
  const variables = toCssVariables();
  const declarations = Object.entries(variables)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join("\n");

  style.textContent = `:root {\n${declarations}\n}`;
  document.head.appendChild(style);
}
