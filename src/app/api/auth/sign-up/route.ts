import { AuthServiceProvider } from "@/domain/services/authService";
import type { AuthService } from "@/domain/services/authService";
import { signUpDto, type SignUpDto } from "@/domain/dtos/authDto";
import { Endpoint, Body, Require, type Ctx } from "@/domain/decorators/controller";

type Deps = { authService: AuthService };

export const POST = Endpoint<SignUpDto, Deps>(
  Body(signUpDto),
  Require({ authService: AuthServiceProvider }),
  async ({ body, deps }: Ctx<SignUpDto, Deps>) => {
    await deps.authService.signUp(body);

    return {
      status: 201,
      message: "Account created. Check your email to confirm your address.",
    };
  }
);
