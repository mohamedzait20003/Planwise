import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Two suites, deliberately separated.
 *
 * The domain suite runs in Node. Giving it a DOM would be slower and, worse,
 * would let a test quietly start depending on a browser global that the code it
 * covers can never have.
 *
 * Both run in America/New_York rather than UTC. Month handling is where this
 * app is most likely to break, and the bug only appears west of Greenwich: a
 * DATE read as local time turns 2026-01-01 into 2025-12-31. In UTC those tests
 * pass while the bug ships.
 */
export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
          env: { TZ: "America/New_York" },
        },
      },
      {
        extends: true,
        test: {
          name: "component",
          environment: "jsdom",
          include: ["tests/component/**/*.test.tsx"],
          env: { TZ: "America/New_York" },
          setupFiles: ["tests/component/setup.ts"],
        },
      },
    ],

    coverage: {
      provider: "v8",
      include: [
        "src/lib/utils/**",
        "src/domain/helpers/**",
        "src/domain/services/**",
        "src/components/client/**",
        // The shared primitives — page header, states, stat tile, segmented —
        // live here rather than under `client/` because `admin/` renders them
        // too, and a component named for one half of the app it serves is a
        // dependency nobody reads twice before writing backwards.
        "src/components/common/**",
      ],
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
