import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // docs/task-app-mockup.jsx is the design reference the UI was ported
    // from, not application code — nothing imports it and tsconfig doesn't
    // even include .jsx. Linting it only ever produced noise that trained us
    // to ignore a red `pnpm lint`.
    "docs/**",
  ]),
]);

export default eslintConfig;
