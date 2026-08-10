import "server-only";

/**
 * Shared foundation for the decorator layer.
*/

/**
 * Base for every expected failure — a rule the caller broke, not a bug.
*/
export class DomainError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** A uniqueness constraint rejected the write (Prisma P2002). */
export class UniqueConstraintError extends DomainError {
  constructor(
    readonly fields: string[],
    cause?: unknown
  ) {
    super(`Already exists: ${fields.join(", ") || "unique constraint"}`, cause);
  }
}

/** The row the operation targeted does not exist (Prisma P2025). */
export class NotFoundError extends DomainError {
  constructor(what = "Record", cause?: unknown) {
    super(`${what} not found`, cause);
  }
}

/** A foreign key refused the write, e.g. a category still in use (P2003). */
export class ReferenceConstraintError extends DomainError {
  constructor(cause?: unknown) {
    super("Referenced record is still in use", cause);
  }
}

/**
 * Input failed validation before it reached the domain.
 *
 * No constructor: `DomainError`'s already takes `(message, cause)` and
 * `new.target.name` yields "ValidationError" without restating anything.
 */
export class ValidationError extends DomainError {}

/**
 * The period a write targets is closed. This is the product rule the brief
 * cares most about, so it gets a first-class error rather than a generic 400.
 */
/**
 * Sign-in was refused because the address has not been confirmed.
 *
 * Distinct from bad credentials on purpose: the password *was* right, so the
 * client needs to route the user to "check your inbox" rather than "try again".
 */
export class EmailNotVerifiedError extends DomainError {
  constructor(message = "Email not verified") {
    super(message);
  }
}

/** Credentials did not match, or the account has no password at all. */
export class InvalidCredentialsError extends DomainError {
  constructor(message = "Invalid email or password") {
    super(message);
  }
}

/** A one-time token was unknown, already used, or past its expiry. */
export class InvalidTokenError extends DomainError {
  constructor(message = "This link is invalid or has expired") {
    super(message);
  }
}

export class PeriodLockedError extends DomainError {
  constructor(readonly month: string) {
    super(`${month} is locked and cannot be modified`);
  }
}

/* decorator metadata */

export type Layer = "model" | "repository" | "service" | "controller";

const LAYERS = new WeakMap<object, Layer>();
const NAMES = new WeakMap<object, string>();

export function describeClass(target: object, layer: Layer, name: string): void {
  LAYERS.set(target, layer);
  NAMES.set(target, name);
}

export function layerOf(target: object): Layer | undefined {
  return LAYERS.get(target);
}

export function nameOf(target: object): string | undefined {
  return NAMES.get(target);
}

/* utilities */

/** Constructor shape accepted by the class decorators in this layer. */
export type ClassOf<T = object> = new (...args: never[]) => T;

/** Any error class, for registries keyed by constructor. */
export type ErrorClass = abstract new (...args: never[]) => Error;

/**
 * Rewrites every method on a prototype through `wrap`.
 *
 * Shared by `@Repository` and any future class decorator that needs uniform
 * per-method behaviour. Accessors are skipped on purpose — reading a getter to
 * wrap it would execute it at decoration time.
 */
export function wrapPrototypeMethods(
  target: ClassOf,
  wrap: (
    original: (...args: unknown[]) => unknown,
    methodName: string
  ) => (...args: unknown[]) => unknown
): void {
  const proto = target.prototype as Record<string, unknown>;

  for (const key of Object.getOwnPropertyNames(proto)) {
    if (key === "constructor") continue;

    const descriptor = Object.getOwnPropertyDescriptor(proto, key);
    if (!descriptor || typeof descriptor.value !== "function") continue;

    const original = descriptor.value as (...args: unknown[]) => unknown;

    Object.defineProperty(proto, key, {
      ...descriptor,
      value: wrap(original, key),
    });
  }
}
