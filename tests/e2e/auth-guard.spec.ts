import { expect, test } from "@playwright/test";

/**
 * The route guard in `proxy.ts`.
 *
 * Worth an end-to-end test specifically because it is middleware: it runs
 * before any page code, so nothing in the unit suite can reach it, and a broken
 * matcher exposes every signed-in screen without a single import changing.
 *
 * No database needed — the guard rejects on the absence of a session cookie,
 * which it decides before any query would run.
 */

const PROTECTED = [
  "/client/dashboard",
  "/client/categories",
  "/client/plans",
  "/client/actuals",
  "/client/report",
  "/client/periods",
  "/admin/dashboard",
];

test.describe("signed out", () => {
  for (const path of PROTECTED) {
    test(`${path} redirects to sign-in`, async ({ page }) => {
      await page.goto(path);

      await expect(page).toHaveURL(/\/auth\/sign-in/);
    });
  }

  test("carries the original destination so sign-in can return there", async ({
    page,
  }) => {
    // The sign-in form reads this back. Without it every bounce silently
    // becomes "go to the dashboard", and a shared deep link never arrives.
    await page.goto("/client/report");

    const url = new URL(page.url());
    expect(url.searchParams.get("callbackUrl")).toBe("/client/report");
  });

  test("preserves a query string on the original destination", async ({ page }) => {
    await page.goto("/client/actuals?month=2026-01");

    const callback = new URL(page.url()).searchParams.get("callbackUrl");
    expect(callback).toBe("/client/actuals?month=2026-01");
  });

  test("leaves public routes alone", async ({ page }) => {
    for (const path of ["/", "/auth/sign-in", "/auth/sign-up"]) {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`${path.replace("/", "\\/")}$`));
    }
  });
});

test.describe("the API", () => {
  test("answers 401 rather than redirecting", async ({ request }) => {
    // A redirect to an HTML page is useless to a fetch. `Auth()` exists to make
    // the API say no in a way a client can branch on.
    const response = await request.get("/api/client/categories");

    expect(response.status()).toBe(401);
  });

  test("returns the envelope shape on refusal", async ({ request }) => {
    const response = await request.get("/api/client/report?from=2026-01&to=2026-03");
    const body = await response.json();

    expect(response.status()).toBe(401);
    expect(body).toMatchObject({ message: expect.any(String), error: expect.any(String) });
  });
});
