import { baseApi } from "@/lib/api/baseApi";
import type { ApiEnvelope } from "@/lib/api/types";

/**
 * Auth request handlers.
 *
 * Plain async functions returning the raw `{ message, data }` envelope — the
 * hooks unwrap it. Keeping them free of React means they can also be called
 * from a server action or a test without a query client.
 *
 * Sign-in is deliberately absent, and so is Google: both go through next-auth's
 * provider flow, which writes a cookie and redirects rather than answering
 * JSON. `useSignIn` calls it directly for that reason.
 */

export type SignUpInput = {
  FName: string;
  LName: string;
  Email: string;
  password: string;
  userName?: string;
};

export type ResetPasswordInput = {
  token: string;
  password: string;
};

export async function signUp(
  input: SignUpInput
): Promise<ApiEnvelope<undefined>> {
  const res = await baseApi.post<ApiEnvelope<undefined>>("/auth/sign-up", input);
  return res.data;
}

export async function verifyEmail(
  token: string
): Promise<ApiEnvelope<undefined>> {
  const res = await baseApi.post<ApiEnvelope<undefined>>("/auth/email-verify", {
    token,
  });
  return res.data;
}

export async function requestPasswordReset(
  Email: string
): Promise<ApiEnvelope<undefined>> {
  const res = await baseApi.post<ApiEnvelope<undefined>>("/auth/pass-forget", {
    Email,
  });
  return res.data;
}

export async function resetPassword(
  input: ResetPasswordInput
): Promise<ApiEnvelope<undefined>> {
  const res = await baseApi.post<ApiEnvelope<undefined>>(
    "/auth/pass-reset",
    input
  );
  return res.data;
}
