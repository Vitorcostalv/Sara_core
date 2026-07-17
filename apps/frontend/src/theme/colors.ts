// Natural / field-lab palette for the ecological thesis UI.
// Warm-neutral light workspace: forest green, muted blue, clay, off-white, sand.
export const colors = {
  background: {
    primary: "#f4efe4",
    secondary: "#efe7d8",
    subtle: "#e7ddca"
  },
  surface: {
    base: "#fffaf0",
    elevated: "#ffffff",
    contrast: "#1f2a24"
  },
  brand: {
    primary: "#2f6b4f",
    secondary: "#2f6f8f",
    accent: "#c98b3c"
  },
  border: {
    base: "rgba(56, 76, 62, 0.18)",
    strong: "rgba(56, 76, 62, 0.34)"
  },
  text: {
    primary: "#1f2a24",
    secondary: "#3f4a43",
    muted: "#5d6b62",
    inverse: "#fffaf0"
  },
  semantic: {
    success: "#2f6b4f",
    warning: "#b7791f",
    error: "#b84a3a",
    info: "#2f6f8f"
  },
  state: {
    hover: "rgba(47, 107, 79, 0.08)",
    active: "rgba(47, 107, 79, 0.14)",
    disabled: "rgba(120, 120, 116, 0.32)"
  }
} as const;
