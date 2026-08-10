import { z } from "zod";

/**
 * Request DTOs for the auth endpoints.
 *
 * The schema *is* the DTO: `z.infer` derives the type, so there is no separate
 * interface to drift from the validation. `Body()` in the controller consumes
 * these directly.
 *
 * Not server-only on purpose — the same schemas should drive client-side form
 * validation, so the browser rejects a short password without a round trip and
 * the rules cannot disagree between the two.
 */

/**
 * Addresses are trimmed and lower-cased before they reach the domain.
 *
 * `Email` is uniquely indexed and Postgres compares case-sensitively, so
 * without this "Ada@x.co" and "ada@x.co" become two separate accounts — and
 * the second sign-up succeeds instead of being rejected as a duplicate.
 */
const email = z.email("must be a valid address").trim().toLowerCase();

/**
 * Length is the only rule. Composition requirements (a digit, a symbol) push
 * people toward predictable patterns without adding much real entropy, and the
 * bcrypt cost already carries the weight.
 */
const password = z
  .string()
  .min(8, "must be at least 8 characters")
  .max(200, "must be at most 200 characters");

const name = z.string().trim().min(1, "is required").max(80, "is too long");

/** One-time tokens from a verification or reset link. */
const token = z.string().trim().min(1, "is required").max(512, "is too long");

export const signUpDto = z.object({
  FName: name,
  LName: name,
  Email: email,
  password,
});
export type SignUpDto = z.infer<typeof signUpDto>;

export const signInDto = z.object({
  Email: email,
  // Not the `password` schema: an existing account's password predates today's
  // rules, and applying them here would answer "too short" instead of "wrong
  // password" — which also tells an attacker the length was wrong, not the value.
  password: z.string().min(1, "is required"),
});
export type SignInDto = z.infer<typeof signInDto>;

export const googleSignDto = z.object({
  providerAccountId: z.string().trim().min(1, "is required").max(255),
  Email: email,
  FName: name,
  LName: name,
});
export type GoogleSignDto = z.infer<typeof googleSignDto>;

export const emailVerifyDto = z.object({ token });
export type EmailVerifyDto = z.infer<typeof emailVerifyDto>;

export const passForgetDto = z.object({ Email: email });
export type PassForgetDto = z.infer<typeof passForgetDto>;

export const passResetDto = z.object({ token, password });
export type PassResetDto = z.infer<typeof passResetDto>;
