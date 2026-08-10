import { authService } from "@/domain/services/authService";
import type { AuthService } from "@/domain/services/authService";
import { googleSignDto, type GoogleSignDto } from "@/domain/dtos/authDto";
import { Endpoint, Body, Require, type Ctx } from "@/domain/decorators/controller";

type Deps = { authService: AuthService };

export const POST = Endpoint<GoogleSignDto, Deps>(
  Body(googleSignDto),
  Require({ authService }),
  async ({ body, deps }: Ctx<GoogleSignDto, Deps>) => {
    const user = await deps.authService.signInWithGoogle(body);

    return {
      message: "Signed in with Google",
      data: { profile: user.profile },
    };
  }
);
