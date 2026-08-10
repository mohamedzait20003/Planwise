import { Endpoint, Body, Require, type Ctx } from "@/domain/decorators/controller";
import { authService } from "@/domain/services/authService";
import type { AuthService } from "@/domain/services/authService";
import { emailVerifyDto, type EmailVerifyDto } from "@/domain/dtos/authDto";

type Deps = { authService: AuthService };

/**
 * POST /api/auth/email-verify
 *
 * Consumes the token and stamps `emailVerifiedAt`. The token is deleted on
 * success, so the link works exactly once; an unknown, spent or expired token
 * is an `InvalidTokenError` mapped to 400 with the same wording for all three,
 * which keeps it from confirming that a given token ever existed.
 */
export const POST = Endpoint<EmailVerifyDto, Deps>(
  Body(emailVerifyDto),
  Require({ authService }),
  async ({ body, deps }: Ctx<EmailVerifyDto, Deps>) => {
    await deps.authService.verifyEmail(body.token);
    return { message: "Email verified. You can sign in now." };
  }
);
