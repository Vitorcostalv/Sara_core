import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

const unusedVarsRule = [
  "error",
  {
    argsIgnorePattern: "^_",
    varsIgnorePattern: "^_"
  }
];

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/node_modules/**", "pixel-agents/**", ".tmp/**"]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["apps/backend/src/**/*.ts", "packages/shared-types/src/**/*.ts"],
    languageOptions: {
      globals: globals.node
    },
    rules: {
      "no-undef": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": unusedVarsRule
    }
  },
  {
    files: ["apps/frontend/src/**/*.{ts,tsx}", "apps/frontend/vite.config.ts"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    rules: {
      "no-undef": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": unusedVarsRule
    }
  }
);
