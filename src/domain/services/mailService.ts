import "server-only";

import { Service } from "../decorators/service";
import { provide } from "../decorators/provider";
import { renderMail, type Mailable } from "../decorators/mailer";
import { MailTransportProvider, type MailTransport } from "../infra/mail";

@Service({ name: "MailService" })
export class MailService {
  constructor(
    private readonly transport: MailTransport = MailTransportProvider.get()
  ) {}

  async send(mailable: Mailable): Promise<void> {
    await this.transport.send(renderMail(mailable));
  }

  async sendQuietly(mailable: Mailable): Promise<void> {
    try {
      await this.send(mailable);
    } catch (error) {
      console.error("[mail] delivery failed", error);
    }
  }
}

export const MailServiceProvider = provide("MailService", () => new MailService());
