import { z } from "zod";

import { Role } from "../../../generated/prisma/client";

/**
 * The admin console's inputs.
 *
 * The list filters get a schema of their own even though they arrive as query
 * parameters rather than a JSON body, because `page=0` and `perPage=100000` are
 * both things a URL can say and neither is something the endpoint should carry
 * out. `Body()` is the only step wired to a schema, so `AdminService` parses
 * this one itself — the validation still lives with the DTO either way.
 */

/** Page numbers are 1-based, matching how the pager reads to a user. */
const page = z.coerce.number().int().min(1).catch(1);

/**
 * Capped, and the cap is not negotiable from the URL.
 *
 * `.catch()` rather than an error: a malformed page size is a convenience
 * parameter being wrong, and answering a browsable list with a 400 helps nobody.
 */
const perPage = z.coerce.number().int().min(1).max(100).catch(25);

export const listUsersDto = z.object({
  // Bounded because it becomes a `contains` — an unbounded needle is a slow
  // query anyone can send.
  query: z.string().trim().max(120).optional().catch(undefined),
  role: z.enum(Role).optional().catch(undefined),
  verified: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional()
    .catch(undefined),
  page,
  perPage,
});
export type ListUsersDto = z.infer<typeof listUsersDto>;

/**
 * Change a role, a verification state, or both.
 *
 * `verified` is a boolean the service maps onto `emailVerifiedAt`, rather than
 * letting the caller send a timestamp it has no business choosing — the same
 * shape, and the same reason, as `archived` on the category DTO.
 */
export const updateUserDto = z
  .object({
    role: z.enum(Role).optional(),
    verified: z.boolean().optional(),
  })
  .refine((input) => input.role !== undefined || input.verified !== undefined, {
    message: "nothing to update",
  });
export type UpdateUserDto = z.infer<typeof updateUserDto>;
