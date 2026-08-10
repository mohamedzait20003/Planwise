import "server-only";

import {
  NotFoundError,
  ReferenceConstraintError,
  UniqueConstraintError,
  describeClass,
  wrapPrototypeMethods,
  type ClassOf,
} from "./global";

/**
 * Repository-layer decorators.
 *
 * Repositories are the only place that talks to Prisma, and they must reach it
 * through `db()` from `./service` rather than importing the client directly —
 * that is what lets a call made inside `@Transactional()` enlist in the ambient
 * transaction.
 *
 * `@Repository()` exists to stop Prisma's error vocabulary leaking upward. A
 * service should catch `UniqueConstraintError`, not sniff for `"P2002"`.
 *
 * The error classes themselves live in `./global` so the HTTP layer can map
 * them to statuses without importing the data layer.
 */

type PrismaKnownError = {
  code: string;
  meta?: { target?: unknown; modelName?: unknown };
};

function isPrismaKnownError(error: unknown): error is PrismaKnownError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  );
}

/** Translates a Prisma error into a domain error, or rethrows it untouched. */
export function translatePrismaError(error: unknown): never {
  if (!isPrismaKnownError(error)) throw error;

  const target = error.meta?.target;
  let fields: string[] = [];
  if (Array.isArray(target)) fields = target.map(String);
  else if (typeof target === "string") fields = [target];

  switch (error.code) {
    case "P2002":
      throw new UniqueConstraintError(fields, error);
    case "P2025":
      throw new NotFoundError(
        typeof error.meta?.modelName === "string" ? error.meta.modelName : "Record",
        error
      );
    case "P2003":
      throw new ReferenceConstraintError(error);
    default:
      throw error;
  }
}

/**
 * Wraps every method on the class so Prisma errors surface as domain errors.
 *
 * Applied at the class level rather than per method because the failure mode of
 * forgetting one is silent: a single un-wrapped method leaks a raw `P2002`, and
 * the `catch (e instanceof UniqueConstraintError)` above it simply never
 * matches.
 */
export function Repository(options: { name: string }) {
  return function <C extends ClassOf>(target: C): C {
    describeClass(target, "repository", options.name);

    wrapPrototypeMethods(target, (original) => {
      return function (this: unknown, ...args: unknown[]) {
        try {
          const result = original.apply(this, args);
          // Async methods reject rather than throw, so the promise needs its
          // own translation hop.
          return result instanceof Promise
            ? result.catch(translatePrismaError)
            : result;
        } catch (error) {
          translatePrismaError(error);
        }
      };
    });

    return target;
  };
}

// Re-exported so repositories and services can import their error vocabulary
// from the layer they already depend on.
export {
  DomainError,
  NotFoundError,
  PeriodLockedError,
  ReferenceConstraintError,
  UniqueConstraintError,
  ValidationError,
} from "./global";
