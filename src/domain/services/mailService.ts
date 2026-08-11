import "server-only";

import { Service } from "../decorators/service";
import { provide } from "../decorators/provider";
import { renderMail, type Mailable } from "../decorators/mailer";
import { MailTransportProvider, type MailTransport } from "../infra/mail";

/**
 * Renders mailables and hands them to the transport.
 *
 * Injected into other services rather than imported, so a test can override the
 * provider and assert on what would have been sent without touching SMTP.
 *
 * Deliberately **not** `@Transactional`. Sending mail inside a database
 * transaction is a trap: the send is not rolled back, so a failure after it
 * leaves a live verification link pointing at a user row that no longer exists.
 * Callers should send after their transaction commits.
 */
@Service({ name: "MailService" })
export class MailService {
  constructor(
    private readonly transport: MailTransport = MailTransportProvider.get()
  ) {}

  async send(mailable: Mailable): Promise<void> {
    await this.transport.send(renderMail(mailable));
  }

  /**
   * Sends without letting a delivery failure fail the caller.
   *
   * For mail that is a courtesy rather than the point of the request. Sign-up
   * uses this: the account exists either way, and the user can trigger a fresh
   * link by signing in. A password reset should use `send` instead — silently
   * swallowing that one strands the user with no way forward.
   */
  async sendQuietly(mailable: Mailable): Promise<void> {
    try {
      await this.send(mailable);
    } catch (error) {
      console.error("[mail] delivery failed", error);
    }
  }
}

export const MailServiceProvider = provide("MailService", () => new MailService());
