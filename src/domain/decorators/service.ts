import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";

import prisma from "../infra/prisma";
import type { Prisma } from "../../../generated/prisma/client";


/**
 * Anything you can run Prisma queries on. Prisma already models this exactly —
 * hand-rolling the Omit drifts from whatever the generated client actually
 * hands to `$transaction`.
 */
export type Db = Prisma.TransactionClient;

const txStorage = new AsyncLocalStorage<Db>();

export function db(): Db {
    return txStorage.getStore() ?? prisma;
}

export function inTransaction(): boolean {
    return txStorage.getStore() !== undefined;
}

export function Transactional(options?: { timeout?: number; maxWait?: number }) {
    // Legacy method decorator: (prototype, propertyKey, descriptor). The
    // replacement goes on `descriptor.value` — returning a bare function, as
    // stage-3 decorators do, would silently do nothing here.
    return function (
        _prototype: object,
        _propertyKey: string | symbol,
        descriptor: PropertyDescriptor
    ): PropertyDescriptor {
        const original = descriptor.value as (
            this: unknown,
            ...args: unknown[]
        ) => Promise<unknown>;

        descriptor.value = async function (this: unknown, ...args: unknown[]) {
            // Already inside a transaction: join it rather than opening a
            // second connection whose writes would escape the outer rollback.
            if (txStorage.getStore()) return original.apply(this, args);

            return prisma.$transaction(
                (tx) => txStorage.run(tx as Db, () => original.apply(this, args)),
                {
                    timeout: options?.timeout ?? 10_000,
                    maxWait: options?.maxWait ?? 5_000,
                }
            );
        };

        return descriptor;
    };
}

const SERVICE_NAMES = new WeakMap<object, string>();

export function serviceNameOf(target: object): string | undefined {
    return SERVICE_NAMES.get(target);
}

/**
 * Marks a class as a service. Deliberately behaviour-free — it names the layer
 * and gives one place to hang cross-cutting concerns later.
 */
export function Service(options: { name: string }) {
    return function <C extends new (...args: never[]) => object>(target: C): C {
        SERVICE_NAMES.set(target, options.name);
        return target;
    };
}
