import { authService } from "@/domain/services/authService";
import type { AuthService } from "@/domain/services/authService";
import { signInDto, type SignInDto } from "@/domain/dtos/authDto";
import { Endpoint, Body, Require, type Ctx } from "@/domain/decorators/controller";

type Deps = { authService: AuthService };

export const POST = Endpoint<SignInDto, Deps>(
  Body(signInDto),
  Require({ authService }),
  async ({ body, deps }: Ctx<SignInDto, Deps>) => {
    const user = await deps.authService.signIn(body);

    return {
      message: "Signed in",
      data: { profile: user.profile },
    };
  }
);
