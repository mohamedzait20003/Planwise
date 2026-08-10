import { authService } from "@/domain/services/authService";
import type { AuthService } from "@/domain/services/authService";
import { passForgetDto, type PassForgetDto } from "@/domain/dtos/authDto";
import { Endpoint, Body, Require, type Ctx } from "@/domain/decorators/controller";

type Deps = { authService: AuthService };

export const POST = Endpoint<PassForgetDto, Deps>(
  Body(passForgetDto),
  Require({ authService }),
  async ({ body, deps }: Ctx<PassForgetDto, Deps>) => {
    await deps.authService.requestPasswordReset(body.Email);

    return {
      message:
        "If an account exists for that address, a reset link is on its way.",
    };
  }
);
