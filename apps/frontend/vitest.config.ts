import { defineConfig } from "vitest/config";

// Smoke/contract test runner for the thesis release candidate. Deliberately lightweight:
// jsdom for the little DOM/localStorage surface the tests touch, no Three.js/WebGL rendering.
export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    globals: false,
    css: false,
  },
});
