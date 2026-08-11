import { AuthServiceProvider } from "@/domain/services/authService";
import type { AuthService } from "@/domain/services/authService";
import { passResetDto, type PassResetDto } from "@/domain/dtos/authDto";
import { Endpoint, Body, Require, type Ctx } from "@/domain/decorators/controller";

type Deps = { authService: AuthService };

export const POST = Endpoint<PassResetDto, Deps>(
  Body(passResetDto),
  Require({ authService: AuthServiceProvider }),
  async ({ body, deps }: Ctx<PassResetDto, Deps>) => {
    await deps.authService.resetPassword(body.token, body.password);
    return { message: "Password updated. You can sign in now." };
  }
);
