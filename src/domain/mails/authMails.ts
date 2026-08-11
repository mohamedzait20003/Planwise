import "server-only";

import { Mailer, type Mailable } from "../decorators/mailer";

/**
 * The mails the auth flows send.
 *
 * Each is a class carrying its own envelope and template name, so a service
 * says `mail.send(new VerifyEmailMail(...))` and never assembles a subject line
 * or interpolates a URL itself. Bodies live in `src/resources/templates/*.hbs`.
 */

/**
 * Built here rather than inside the template so the base URL is resolved once
 * and the token is percent-encoded — a base64url token is URL-safe today, but
 * the template has no way to escape one if that ever changes.
 */
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
