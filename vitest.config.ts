import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    env: { TZ: "America/New_York" },
    coverage: {
      provider: "v8",
      include: ["src/lib/utils/**", "src/domain/helpers/**", "src/domain/services/**"],
    },
  },

  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("./tests/server-only.stub.ts", import.meta.url)
      ),
    },
  },
});
