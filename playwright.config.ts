import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;

/**
 * End-to-end tests.
 *
 * These drive a real browser against a real build, which is why there are no
 * jsdom component tests alongside the unit suite — a simulated DOM would assert
 * that the code does what it says, and this asserts that the page does what the
 * user needs.
 *
 * The specs here are the ones that hold without a database: public pages, the
 * auth guard, and client-side form validation. Anything that needs a signed-in
 * user needs a migrated database and a seeded account, so those live behind
 * `E2E_BASE_URL` pointing at an environment that has one.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  // Started against a production build rather than `next dev`: dev compiles
  // routes on first request, which turns the first navigation of every spec
  // into a timeout waiting on a compiler.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npm run build && npx next start --port ${PORT}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        env: {
          DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://e2e:e2e@localhost:5432/e2e?schema=public",
          NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? "e2e-placeholder-secret",
          NEXTAUTH_URL: baseURL,
        },
      },
});
