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
  ]),
  {
    rules: {
      // Advisory perf hint, not a correctness rule. Our mount-fetch / route-change
      // effects are intentional, so keep the signal but don't fail the lint gate.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
