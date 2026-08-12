import { z } from "zod";

/**
 * Field schemas shared by the resource DTOs.
 *
 * Not server-only: the same schemas should drive client-side form validation so
 * the browser rejects a malformed month without a round trip, and the two can
 * never disagree about what is valid.
 */

/**
 * A calendar month.
 *
 * The regex rejects "2026-13" and "2026-1" as well as the obvious garbage.
 * Kept a string all the way to the repository, which converts it in one place —
 * see `helpers/period.ts` for why parsing it early is a timezone bug.
 */
export const month = z
  .string()
  .trim()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'must be a month formatted "YYYY-MM"');

/**
 * Money.
 *
 * Bounded to match `Decimal(14, 2)`: anything larger overflows the column and
 * fails at the database with an error no user can act on. Negative is refused —
 * a negative plan is meaningless, and a refund belongs in the data as a
 * separate concern rather than a negative actual.
 */
export const money = z
  .number()
  .finite("must be a number")
  .min(0, "cannot be negative")
  .max(999_999_999_999, "is too large")
  // Two decimal places is what the column stores; rounding here means the value
  // the client sees back is the value it sent.
  .transform((value) => Math.round(value * 100) / 100);

export const cuid = z.string().trim().min(1, "is required").max(64);

export const note = z
  .string()
  .trim()
  .max(200, "must be at most 200 characters")
  // An empty box means "no note", which is null and not "".
  .transform((value) => (value === "" ? null : value));

export const categoryName = z
  .string()
  .trim()
  .min(1, "is required")
  .max(80, "is too long");

/** Inclusive month range, used by the report. */
export const monthRange = z
  .object({ from: month, to: month })
  .refine((range) => range.from <= range.to, {
    message: "the start month must not be after the end month",
    path: ["from"],
  });
