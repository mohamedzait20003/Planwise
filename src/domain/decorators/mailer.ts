import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import Handlebars from "handlebars";

import { ClassOf, describeClass } from "./global";

/**
 * Laravel-style mailables.
 *
 * A mail is a class that declares its own envelope and names a body template,
 * and carries the data that template interpolates:
 *
 *   @Mailer({ subject: "Confirm your email", template: "verify-email" })
 *   export class VerifyEmailMail implements Mailable {
 *     readonly data: Record<string, unknown>;
 *     constructor(readonly to: string, FName: string, token: string) {
 *       this.data = { FName, url: `.../auth/email-verify?token=${token}` };
 *     }
 *   }
 *
 *   await mail.send(new VerifyEmailMail(user.Email, user.FName, raw));
 *
 * `template` is a name, not source: it resolves to
 * `src/resources/templates/<name>.hbs`, so copy changes never touch TypeScript.
 *
 * Two things are deliberately deferred to send time rather than captured when
 * the decorator runs — templates are read from disk, and `from` is read from
 * the environment. Decorators execute on module import, which also happens
 * during build-time analysis, where neither the working directory nor the env
 * matches what a request will see.
 *
 * Layout below: public API first, private template loading at the bottom.
 */

/* ----------------------------------------------------------------- contract */

/** What every mail class must provide. */
export interface Mailable {
  /** Recipient address. */
  readonly to: string;
  /** Values the template interpolates. */
  readonly data: Record<string, unknown>;
}

export type MailerOptions = {
  /** Static subject, or one derived from the data. */
  subject: string | ((data: Record<string, unknown>) => string);
  /** Template name, resolved to `src/resources/templates/<name>.hbs`. */
  template: string;
  /** Overrides MAIL_FROM for this mail only. */
  from?: string;
  /** Reply-To, when it should differ from the sender. */
  replyTo?: string;
};

/** A mail with its template rendered, ready for a transport. */
export type RenderedMail = {
  to: string;
  from: string;
  replyTo?: string;
  subject: string;
  text: string;
};

/* ---------------------------------------------------------------- decorator */

type MailMeta = {
  subject: (data: Record<string, unknown>) => string;
  template: string;
  from?: string;
  replyTo?: string;
};

const MAILS = new WeakMap<object, MailMeta>();

export function Mailer(options: MailerOptions) {
  // Normalized once so `renderMail` has a single shape to call, rather than
  // re-checking whether the subject is a function on every send.
  const subject =
    typeof options.subject === "function"
      ? options.subject
      : () => options.subject as string;

  return function <C extends ClassOf<Mailable>>(target: C): C {
    describeClass(target, "model", target.name);
    MAILS.set(target, {
      subject,
      template: options.template,
      from: options.from,
      replyTo: options.replyTo,
    });
    return target;
  };
}

/* ------------------------------------------------------------------ render */

export function renderMail(mailable: Mailable): RenderedMail {
  const meta = MAILS.get(mailable.constructor);

  // Refuse rather than fall back to a blank body: a mail that sends with no
  // subject and no content is worse than one that fails loudly.
  if (!meta) {
    throw new Error(
      `${mailable.constructor.name} is not decorated with @Mailer, so it has no ` +
        `subject or template. Refusing to send.`
    );
  }

  return {
    to: mailable.to,
    from: meta.from ?? process.env.MAIL_FROM ?? "no-reply@planwise.local",
    replyTo: meta.replyTo,
    subject: meta.subject(mailable.data),
    text: template(meta.template)(mailable.data),
  };
}

/* ------------------------------------------------------- template loading */

/**
 * Resolved from `process.cwd()` — the project root both in development and in
 * a deployed function — rather than from this module's location, which the
 * bundler rewrites.
 */
const TEMPLATE_DIR = join(process.cwd(), "src", "resources", "templates");

const COMPILED = new Map<string, Handlebars.TemplateDelegate>();

/** Loads and compiles `<name>.hbs` on first use, then caches per process. */
function template(name: string): Handlebars.TemplateDelegate {
  const cached = COMPILED.get(name);
  if (cached) return cached;

  const file = join(TEMPLATE_DIR, `${name}.hbs`);

  let source: string;
  try {
    source = readFileSync(file, "utf8");
  } catch (cause) {
    throw new Error(
      `Mail template "${name}" not found at ${file}. If this works locally but ` +
        `not once deployed, the .hbs files were not traced into the bundle — ` +
        `see outputFileTracingIncludes in next.config.ts.`,
      { cause }
    );
  }

  // noEscape because these bodies are text/plain, where HTML escaping is not
  // merely pointless but wrong: Handlebars escapes `=` to `&#x3D;`, which turns
  // every "?token=..." link into a dead one. If HTML bodies are added later
  // they must escape, and should go through a separate compile path.
  const compiled = Handlebars.compile(source, { noEscape: true });
  COMPILED.set(name, compiled);
  return compiled;
}
