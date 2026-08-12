export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** The period is closed. Endpoints answer 423 for this. */
  get isLocked() {
    return this.status === 423;
  }

  /** Signed in, but the address is not confirmed yet. */
  get isUnverified() {
    return this.status === 403 && this.code === "EmailNotVerifiedError";
  }

  get isUnauthorized() {
    return this.status === 401;
  }
}

const CODES: Record<string, { status: number; message: string }> = {
  InvalidCredentialsError: {
    status: 401,
    message: "Invalid email or password",
  },
  EmailNotVerifiedError: {
    status: 403,
    message: "Your email is not verified. We have sent a new confirmation link.",
  },
  ValidationError: {
    status: 409,
    message: "An unverified account already uses this email. Verify it before linking Google.",
  },

  /* raised by the signIn callback before the service is reached */
  GoogleEmailUnverified: {
    status: 403,
    message:
      "Google has not confirmed that address, so it cannot be used to sign in.",
  },
  GoogleProfileIncomplete: {
    status: 400,
    message:
      "Google did not share a full name for that account. Sign up with email instead.",
  },

  /* raised by /auth/callback when the session did not survive the round trip */
  SessionMissing: {
    status: 401,
    message: "Your session did not stick. Please sign in again.",
  },

  /* next-auth's own, for failures that never reach our callbacks */
  CredentialsSignin: { status: 401, message: "Invalid email or password" },
  OAuthSignin: {
    status: 502,
    message: "Could not start Google sign-in. Please try again.",
  },
  OAuthCallback: {
    status: 502,
    message: "Google sign-in was interrupted. Please try again.",
  },
  AccessDenied: {
    status: 403,
    message: "That account is not allowed to sign in.",
  },
  Configuration: {
    status: 500,
    message: "Sign-in is misconfigured. Please contact support.",
  },
};

/** Rebuilds an `ApiError` from a next-auth error code. */
export function authError(code: string): ApiError {
  const known = CODES[code];

  // An unmapped code is our bug, not the user's — it is kept as `.code` for the
  // console but never shown, since it may name an internal class.
  return known
    ? new ApiError(known.status, known.message, code)
    : new ApiError(500, "Something went wrong. Please try again.", code);
}
