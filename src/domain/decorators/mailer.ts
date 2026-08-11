import "server-only";
import { join } from "node:path";
import Handlebars from "handlebars";
import { readFileSync } from "node:fs";


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
  readonly to: string;
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

/* decorator */

type MailMeta = {
  subject: (data: Record<string, unknown>) => string;
  template: string;
  from?: string;
  replyTo?: string;
};

const MAILS = new WeakMap<object, MailMeta>();

export function Mailer(options: MailerOptions) {
  const subject = typeof options.subject === "function" ? options.subject : () => options.subject as string;

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

/* template loading */
const TEMPLATE_DIR = join(process.cwd(), "src", "resources", "templates");

/**
 * A Handlebars environment dedicated to text/plain bodies.
 *
 * Every mail here is plain text, where HTML escaping is not merely pointless
 * but wrong — Handlebars escapes `=` to `&#x3D;`, which turns every
 * "?token=..." link into a dead one.
**/
const TEXT = Handlebars.create();
TEXT.Utils.escapeExpression = (value: unknown) => {
  if (value === null || value === undefined) return "";

  // Stock Handlebars would render a plain object as "[object Object]" and mail
  // it. Dates, arrays and anything with its own toString are fine; only a bare
  // object reaches this, and it always means the caller passed the wrong shape.
  if (
    typeof value === "object" &&
    (value as object).toString === Object.prototype.toString
  ) {
    throw new Error(
      `Mail template received an object where a value was expected. It would ` +
        `render as "[object Object]" — pass a primitive, or a field of the object.`
    );
  }

  if (typeof value === "string")
    return value;
  
  return (value as { toString(): string }).toString();
};

const COMPILED = new Map<string, Handlebars.TemplateDelegate>();

/** Loads and compiles `<name>.hbs` on first use, then caches per process. */
function template(name: string): Handlebars.TemplateDelegate {
  const cached = COMPILED.get(name);
  if (cached)
    return cached;

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

  if (looksLikeHtml(source)) {
    throw new Error(
      `Mail template "${name}" contains HTML, but templates are rendered as ` +
      `text/plain through a non-escaping environment, which would interpolate ` +
      `data unescaped. Add a separate HTML compile path that escapes.`
    );
  }

  const compiled = TEXT.compile(source);
  COMPILED.set(name, compiled);
  return compiled;
}

const HTML_TAGS = new Set([
  "html", "head", "body", "div", "p", "a", "br", "hr", "table", "tr", "td",
  "span", "h1", "h2", "h3", "h4", "h5", "h6", "strong", "b", "em", "i", "img",
  "ul", "ol", "li", "style", "script",
]);

/** Anything shaped like a tag; the name is then checked against the set. */
const TAG_LIKE = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;

function looksLikeHtml(source: string): boolean {
  for (const match of source.matchAll(TAG_LIKE)) {
    if (HTML_TAGS.has(match[1].toLowerCase()))
      return true;
  }

  return false;
}
