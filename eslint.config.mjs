import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Logs must never contain names, answers or request bodies (SECURITY.md §3):
      // only console.error/warn with an error id or status are allowed.
      "no-console": ["error", { allow: ["error", "warn"] }],
    },
  },
  {
    // The service-role client may only be imported by server code under src/features/**/actions.ts.
    files: ["src/**/*.tsx", "src/components/**", "src/app/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/supabase/admin",
              message: "Service-role client: only use in admin Server Actions.",
            },
          ],
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
