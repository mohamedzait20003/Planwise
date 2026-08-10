import "server-only";

/**
 * Model-layer decorators.
*/

type ModelMeta = {
    name: string;
    exclude: ReadonlySet<string>;
    months: ReadonlySet<string>;
};

const META = new WeakMap<object, ModelMeta>();

export function Model<T extends object>(options: {
    name: string;
    exclude?: readonly (keyof T & string)[];
    months?: readonly (keyof T & string)[];
}) {
    return function <C extends new (...args: never[]) => T>(target: C): C {
        META.set(target, {
            name: options.name,
            exclude: new Set(options.exclude ?? []),
            months: new Set(options.months ?? []),
        });

        return target;
    };
}

function isDecimal(value: unknown): value is { toNumber: () => number } {
    return (
        typeof value === "object" &&
        value !== null &&
        "toNumber" in value &&
        typeof (value as { toNumber: unknown }).toNumber === "function"
    );
}

/** Formats a `@db.Date` month as "YYYY-MM" using UTC parts, never local ones. */
export function toMonthString(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
}

function normalize(value: unknown): unknown {
    if (isDecimal(value)) return value.toNumber();
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.map(normalize);
    return value;
}

export function toDTO<T extends object>(instance: T): Record<string, unknown> {
    const meta = META.get(instance.constructor);

    if (!meta) {
        throw new Error(
            `${instance.constructor.name} is not decorated with @Model, so it has no ` +
            `declared exclusions. Refusing to serialize it — an undeclared model ` +
            `would silently leak every column it happens to carry.`
        );
    }

    const output: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(instance)) {
        if (meta.exclude.has(key)) continue;

        if (meta.months.has(key) && value instanceof Date) {
            output[key] = toMonthString(value);
            continue;
        }

        output[key] = normalize(value);
    }

    return output;
}

export function toDTOList<T extends object>(items: readonly T[]) {
    return items.map(toDTO);
}
