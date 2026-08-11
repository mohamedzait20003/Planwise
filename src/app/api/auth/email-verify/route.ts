import { AuthServiceProvider } from "@/domain/services/authService";
import type { AuthService } from "@/domain/services/authService";
import { emailVerifyDto, type EmailVerifyDto } from "@/domain/dtos/authDto";
import { Endpoint, Body, Require, type Ctx } from "@/domain/decorators/controller";

type Deps = { authService: AuthService };

export const POST = Endpoint<EmailVerifyDto, Deps>(
  Body(emailVerifyDto),
  Require({ authService: AuthServiceProvider }),
  async ({ body, deps }: Ctx<EmailVerifyDto, Deps>) => {
    await deps.authService.verifyEmail(body.token);
    return { message: "Email verified. You can sign in now." };
  }
);
