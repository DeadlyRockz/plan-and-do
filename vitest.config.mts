import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "server-only": path.resolve(import.meta.dirname, "test/stubs/server-only.ts"),
    },
  },
  test: {
    // Node by default; component tests opt into jsdom with a `@vitest-environment jsdom` docblock.
    environment: "node",
    setupFiles: ["test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    restoreMocks: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/components/ui/**", "src/app/**/*.tsx"],
      thresholds: {
        lines: 75,
        "src/domain/**": { lines: 90, branches: 90 },
      },
    },
  },
});
