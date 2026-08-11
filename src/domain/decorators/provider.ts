import "server-only";

/**
 * Lazy, overridable singletons — the whole of the dependency injection story.
 *
 * A full container was considered and rejected: it buys indirection this app
 * does not need, and Next already gives module singletons for free. What a bare
 * `export const authService = new AuthService()` does *not* give you is a seam
 * for tests — the instance is baked in at import time and every consumer holds
 * the same reference forever.
 *
 * A `Provider` adds exactly that seam and nothing else:
 *
 *   export const UserRepositoryProvider = provide("UserRepository", () => new UserRepository());
 *   export const AuthServiceProvider = provide("AuthService", () => new AuthService());
 *
 *   // in a test
 *   AuthServiceProvider.overrideWith(fakeAuthService);
 *   afterEach(() => resetProviders());
 *
 * Construction is lazy, so importing a module does not open a database
 * connection, and a provider that is never resolved never builds anything.
 */

const ALL: Provider<unknown>[] = [];

export class Provider<T> {
  #instance?: T;
  #override?: T;
  #building = false;

  constructor(
    readonly name: string,
    private readonly factory: () => T
  ) {
    ALL.push(this as Provider<unknown>);
  }

  /** The current value: an override if one is set, otherwise the singleton. */
  get(): T {
    if (this.#override !== undefined) return this.#override;
    if (this.#instance !== undefined) return this.#instance;

    // Two providers whose factories resolve each other would otherwise recurse
    // until the stack dies, with no clue which pair caused it.
    if (this.#building) {
      throw new Error(
        `Circular provider dependency while building ${this.name}. ` +
          `Break the cycle, or resolve one side lazily inside a method.`
      );
    }

    this.#building = true;
    try {
      this.#instance = this.factory();
      return this.#instance;
    } finally {
      this.#building = false;
    }
  }

  /** Swap in a stub. Tests only. */
  overrideWith(value: T): void {
    this.#override = value;
  }

  /** Drop the override and any cached instance. */
  reset(): void {
    this.#override = undefined;
    this.#instance = undefined;
    this.#building = false;
  }
}

export function provide<T>(name: string, factory: () => T): Provider<T> {
  return new Provider(name, factory);
}

/** Clears every provider. Call between tests so state cannot leak across cases. */
export function resetProviders(): void {
  for (const provider of ALL) provider.reset();
}

/** Maps a record of providers to the record of values they resolve to. */
export type Resolved<P extends Record<string, Provider<unknown>>> = {
  [K in keyof P]: P[K] extends Provider<infer T> ? T : never;
};

export function resolveAll<P extends Record<string, Provider<unknown>>>(
  providers: P
): Resolved<P> {
  const out: Record<string, unknown> = {};
  for (const [key, provider] of Object.entries(providers)) {
    out[key] = provider.get();
  }
  return out as Resolved<P>;
}
