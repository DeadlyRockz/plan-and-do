import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

// Layer boundaries from plan/04 §4.2. Each layer lists what it must never import.
const FRAMEWORK = ["react", "react-dom", "react/*", "next", "next/*"];
const UI_LAYERS = ["@/features/*", "@/components/*", "@/app/*"];
const SERVER_LAYERS = ["@/ai/*", "@/server/*"];

function forbid(patterns, message) {
  return ["error", { patterns: [{ group: patterns, message }] }];
}

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      "react/no-danger": "error",
      "no-console": "error",
      // One import order everywhere: packages, then "@/" modules, then relative files.
      "import/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", ["parent", "sibling", "index"]],
          pathGroups: [{ pattern: "@/**", group: "internal" }],
          pathGroupsExcludedImportTypes: ["builtin"],
          alphabetize: { order: "asc", caseInsensitive: true },
          "newlines-between": "never",
        },
      ],
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@anthropic-ai/sdk",
              message:
                "Only src/ai/claude-planner-ai.ts may import the Anthropic SDK (plan/04 §4.2).",
            },
          ],
        },
      ],
    },
  },
  {
    // The adapter, its own test (which needs the SDK's error classes) and the manual eval script.
    files: [
      "src/ai/claude-planner-ai.ts",
      "src/ai/__tests__/claude-planner-ai.test.ts",
      "scripts/**",
    ],
    rules: { "@typescript-eslint/no-restricted-imports": "off" },
  },
  {
    files: ["src/server/logger.ts", "scripts/**"],
    rules: { "no-console": "off" },
  },
  {
    files: ["src/domain/**"],
    rules: {
      "no-restricted-imports": forbid(
        [...FRAMEWORK, ...UI_LAYERS, ...SERVER_LAYERS, "@/lib/*"],
        "domain/ is pure TypeScript: it may import only zod and other domain files.",
      ),
      "no-restricted-globals": [
        "error",
        { name: "window", message: "domain/ runs on the server too." },
        { name: "document", message: "domain/ runs on the server too." },
        { name: "localStorage", message: "domain/ has no I/O." },
        { name: "fetch", message: "domain/ has no I/O." },
      ],
      "no-restricted-properties": [
        "error",
        {
          object: "Date",
          property: "now",
          message: "Pass `today` in; domain/ never reads the clock.",
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: "Pass `today` in; domain/ never reads the clock.",
        },
      ],
    },
  },
  {
    files: ["src/ai/**"],
    rules: {
      "no-restricted-imports": forbid(
        [...FRAMEWORK, ...UI_LAYERS, "@/server/*", "@/lib/*"],
        "ai/ may import only domain/, zod and (in one file) the SDK.",
      ),
    },
  },
  {
    files: ["src/server/**"],
    rules: {
      "no-restricted-imports": forbid(
        [...FRAMEWORK, ...UI_LAYERS],
        "server/ may import only domain/, ai/ and server-only.",
      ),
    },
  },
  {
    files: ["src/app/api/**"],
    rules: {
      "no-restricted-imports": forbid(
        ["@/features/*", "@/components/*"],
        "API routes must not import UI code.",
      ),
    },
  },
  {
    files: ["src/features/**", "src/components/**", "src/lib/**"],
    rules: {
      "no-restricted-imports": forbid(
        SERVER_LAYERS,
        "Client code must not reach server code or the AI adapters.",
      ),
    },
  },
]);

export default eslintConfig;
