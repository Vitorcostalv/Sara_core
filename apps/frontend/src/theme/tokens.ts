export const tokens = {
  typography: {
    family:
      "\"Instrument Sans\", \"Avenir Next\", \"Segoe UI\", sans-serif",
    displayFamily:
      "\"Syne\", \"Arial Narrow\", sans-serif",
    monoFamily:
      "\"IBM Plex Mono\", \"SFMono-Regular\", Consolas, monospace",
    size: {
      xs: "0.75rem",
      sm: "0.875rem",
      md: "1rem",
      lg: "1.125rem",
      xl: "1.375rem",
      "2xl": "1.75rem",
      "3xl": "2.5rem"
    },
    weight: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.7
    }
  },
  spacing: {
    xxs: "0.25rem",
    xs: "0.5rem",
    sm: "0.75rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
    "2xl": "2.5rem",
    "3xl": "3rem"
  },
    radius: {
    sm: "0.55rem",
    md: "0.8rem",
    lg: "1.1rem",
    xl: "1.6rem",
    full: "9999px"
  },
  shadow: {
    sm: "0 8px 24px rgba(5, 10, 26, 0.26)",
    md: "0 18px 42px rgba(4, 8, 22, 0.32)",
    lg: "0 24px 56px rgba(2, 6, 18, 0.4)"
  },
  transition: {
    default: "180ms ease",
    slow: "280ms ease"
  },
  iconSize: {
    sm: "1rem",
    md: "1.25rem",
    lg: "1.5rem"
  },
  controls: {
    buttonHeight: {
      sm: "2rem",
      md: "2.5rem",
      lg: "3rem"
    },
    inputHeight: {
      md: "2.5rem",
      lg: "3rem"
    }
  },
  layout: {
    maxContainerWidth: "1360px",
    sidebarWidth: "308px"
  },
  zIndex: {
    base: 1,
    sticky: 10,
    overlay: 100,
    modal: 200
  }
} as const;
