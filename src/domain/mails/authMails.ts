import "server-only";

import { Mailer, type Mailable } from "../decorators/mailer";

function link(path: string, token: string): string {
  const base = (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(
    /\/$/,
    ""
  );
  return `${base}${path}?token=${encodeURIComponent(token)}`;
}

@Mailer({
  subject: "Confirm your Planwise email",
  template: "verify-email",
})
export class VerifyEmailMail implements Mailable {
  readonly data: Record<string, unknown>;

  constructor(readonly to: string, FName: string, token: string) {
    this.data = { FName, url: link("/auth/email-verify", token) };
  }
}

@Mailer({
  subject: "Reset your Planwise password",
  template: "reset-password",
})
export class ResetPasswordMail implements Mailable {
  readonly data: Record<string, unknown>;

  constructor(readonly to: string, FName: string, token: string) {
    this.data = { FName, url: link("/auth/reset-password", token) };
  }
}
