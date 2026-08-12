"use client";

import { useMutation } from "@tanstack/react-query";
import { signIn as nextAuthSignIn } from "next-auth/react";

import {
  requestPasswordReset,
  resetPassword,
  signUp,
  verifyEmail,
} from "@/lib/handlers/auth";
import { ApiError, authError } from "@/lib/api";

export type SignInInput = {
  Email: string;
  password: string;
};

export function useSignUp() {
  return useMutation({ mutationFn: signUp });
}

export function useSignIn() {
  return useMutation({
    mutationFn: async (input: SignInInput) => {
      const result = await nextAuthSignIn("credentials", {
        ...input,
        redirect: false,
      });

      if (!result) {
        throw new ApiError(
          0,
          "Could not reach the server. Check your connection."
        );
      }

      if (result.error)
        throw authError(result.error);

      return result;
    },
  });
}

export function useVerifyEmail() {
  return useMutation({ mutationFn: verifyEmail });
}

export function useRequestPasswordReset() {
  return useMutation({ mutationFn: requestPasswordReset });
}

export function useResetPassword() {
  return useMutation({ mutationFn: resetPassword });
}
