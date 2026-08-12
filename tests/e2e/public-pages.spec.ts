import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

/**
 * The pages a signed-out visitor can reach.
 *
 * No database is touched by any of these, which is what makes them safe to run
 * in CI against a build with a placeholder connection string. A failure here is
 * a rendering or routing fault, never a data one.
 *
 * Everything is scoped to `<main>`. The nav carries its own "Sign in" control
 * on every page, so an unscoped role query matches two elements and Playwright
 * refuses it — correctly, since the two mean different things.
 */

const form = (page: Page) => page.getByRole("main");

test.describe("landing", () => {
  test("renders and offers a way in", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/planwise/i);

    // The nav's control is a Button rendering an anchor, so it takes the button
    // role rather than link — asserting on the role it actually exposes is the
    // point, since that is what a screen reader announces.
    await expect(
      page.getByRole("banner").getByRole("button", { name: /sign in/i })
    ).toBeVisible();
  });
});

test.describe("sign-in", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/sign-in");
  });

  test("shows both ways to authenticate", async ({ page }) => {
    await expect(form(page).getByLabel(/email/i)).toBeVisible();
    await expect(form(page).getByLabel("Password", { exact: true })).toBeVisible();
    await expect(
      form(page).getByRole("button", { name: /continue with google/i })
    ).toBeVisible();
  });

  test("keeps submit disabled until both fields are filled", async ({ page }) => {
    const submit = form(page).getByRole("button", { name: /^sign in$/i });

    await expect(submit).toBeDisabled();

    await form(page).getByLabel(/email/i).fill("ada@example.com");
    await expect(submit).toBeDisabled();

    await form(page).getByLabel("Password", { exact: true }).fill("hunter2hunter2");
    await expect(submit).toBeEnabled();
  });

  test("reveals the password on demand", async ({ page }) => {
    const field = form(page).getByLabel("Password", { exact: true });
    await field.fill("hunter2hunter2");

    await expect(field).toHaveAttribute("type", "password");
    await form(page).getByRole("button", { name: /show password/i }).click();
    await expect(field).toHaveAttribute("type", "text");
  });

  test("surfaces an error the URL carries", async ({ page }) => {
    // How next-auth reports a failed Google round trip: it redirects back here
    // with a code, and the form has to turn that into something readable
    // rather than leaving the user on a silent page.
    //
    // Asserted on the visible text rather than the alert role, because Next's
    // own route announcer is also role="alert" and always present.
    await page.goto("/auth/sign-in?error=InvalidCredentialsError");

    await expect(
      form(page).getByText(/invalid email or password/i)
    ).toBeVisible();
  });

  test("explains an unverified account instead of blaming the password", async ({
    page,
  }) => {
    await page.goto("/auth/sign-in?error=EmailNotVerifiedError");

    await expect(form(page).getByText(/not verified/i)).toBeVisible();
  });
});

test.describe("sign-up", () => {
  test("will not submit a password mismatch", async ({ page }) => {
    await page.goto("/auth/sign-up");

    await form(page).getByLabel(/first name/i).fill("Ada");
    await form(page).getByLabel(/last name/i).fill("Lovelace");
    await form(page).getByLabel(/email/i).fill("ada@example.com");
    await form(page).getByLabel("Password", { exact: true }).fill("hunter2hunter2");
    await form(page).getByLabel(/confirm password/i).fill("something-else");

    await expect(form(page).getByText(/passwords do not match/i)).toBeVisible();
    await expect(
      form(page).getByRole("button", { name: /create account/i })
    ).toBeDisabled();
  });
});

test.describe("password reset", () => {
  test("refuses to show the form without a token", async ({ page }) => {
    // Arriving without one means the link was mangled. Showing a form that
    // cannot possibly succeed wastes the user's time twice.
    await page.goto("/auth/reset-password");

    await expect(form(page).getByText(/needs a reset link/i)).toBeVisible();
    await expect(form(page).getByLabel(/new password/i)).toHaveCount(0);
  });
});
