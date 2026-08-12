import type { DefaultSession } from "next-auth";
import type { Role } from "../../../generated/prisma/client";

/**
 * Adds `id` and `role` to next-auth's types.
 *
 * Both are written by the callbacks in `domain/infra/auth.ts`, and three places
 * already read them: `proxy.ts` routes on `token.role`, `currentUser()` builds
 * its `AuthUser` from `token.id`, and the nav picks its links from
 * `session.user.role`. Declaring them here is what lets those read the fields
 * directly instead of casting.
 */

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }

  /** What `authorize` returns and what the `signIn` callback may amend. */
  interface User {
    role: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
  }
}
