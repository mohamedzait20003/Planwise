import "server-only";

import nodemailer, { type Transporter } from "nodemailer";

import { provide } from "../decorators/provider";
import type { RenderedMail } from "../decorators/mailer";

/* Mail transport — Gmail SMTP. */
export interface MailTransport {
  send(mail: RenderedMail): Promise<void>;
}

/**
 * Writes the message to the server log instead of sending it.
 *
 * The fallback when SMTP credentials are absent, so local development and CI
 * need no Google account — verification links are printed in full, which is how
 * you complete a sign-up locally. Remove this if you would rather a missing
 * credential fail loudly instead of silently not mailing anyone.
*/

export class LogMailTransport implements MailTransport {
  async send(mail: RenderedMail): Promise<void> {
    console.info(
      [
        "",
        "──────── mail (not sent: no SMTP credentials) ────────",
        `to:      ${mail.to}`,
        `from:    ${mail.from}`,
        mail.replyTo ? `replyTo: ${mail.replyTo}` : null,
        `subject: ${mail.subject}`,
        "",
        mail.text,
        "──────────────────────────────────────────────────────",
        "",
      ].filter((line) => line !== null).join("\n")
    );
  }
}

export class GmailMailTransport implements MailTransport {
  private readonly transporter: Transporter;

  constructor(user: string, appPassword: string) {
    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass: appPassword },
      pool: true,
      maxConnections: 3,
    });
  }

  async send(mail: RenderedMail): Promise<void> {
    await this.transporter.sendMail({
      from: mail.from,
      to: mail.to,
      replyTo: mail.replyTo,
      subject: mail.subject,
      text: mail.text,
    });
  }
}

function transportFromEnv(): MailTransport {
  const user = process.env.GMAIL_USER;
  const appPassword = process.env.GMAIL_APP_PASSWORD;

  if (!user || !appPassword) {
    console.warn(
      "[mail] GMAIL_USER / GMAIL_APP_PASSWORD unset — using the log transport. No mail will be delivered."
    );
    return new LogMailTransport();
  }

  return new GmailMailTransport(user, appPassword);
}

export const MailTransportProvider = provide<MailTransport>(
  "MailTransport",
  transportFromEnv
);
