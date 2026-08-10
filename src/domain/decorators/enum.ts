import "server-only";

import { ValidationError } from "./global";

/**
 * Enum support for the domain layer.
 *
 * A decorator cannot be attached to a TypeScript `enum` — that is the same
 * TS1206 ("Decorators are not valid here") that blocks function decorators,
 * since decorators only apply to classes and class members. So `@Enum` is a
 * *property* decorator: it declares that a field on a model must hold a member
 * of a given enum, and `parseEnum` is the standalone parser for request bodies.
 *
 *   class UserModel {
 *     @Enum(Role) role!: Role;
 *   }
 *
 *   Body((raw) => ({ role: parseEnum(Role, raw.role, "role") }))
 *
 * The motivation is concrete: Prisma generates enums as plain string unions, so
 * nothing stops `"admin"` or `"MANAGER"` reaching a write and failing at the
 * database with a raw Postgres error. Validating at the edge turns that into a
 * 400 that names the field and lists what was allowed.
 */

/** Shape of both a TS `enum` object and a `const` object used as one. */
export type EnumLike = Record<string, string | number>;

type FieldRule = {
  values: ReadonlySet<string | number>;
  enumName: string;
  optional: boolean;
};

const FIELDS = new WeakMap<object, Map<string, FieldRule>>();

/** Members of an enum object, with TS's reverse-mapped numeric keys removed. */
export function enumValues<E extends EnumLike>(source: E): Array<E[keyof E]> {
  const values = Object.values(source);
  // Numeric enums are reverse-mapped: { A: 0, 0: "A" }. Drop the string keys
  // that merely name a numeric member, or "A" would count as a valid value.
  const numeric = values.some((v) => typeof v === "number");
  return (numeric ? values.filter((v) => typeof v === "number") : values) as Array<
    E[keyof E]
  >;
}

export function isEnumMember<E extends EnumLike>(
  source: E,
  value: unknown
): value is E[keyof E] {
  return (enumValues(source) as unknown[]).includes(value as never);
}

/**
 * Parses a value into an enum member or throws a `ValidationError`, which the
 * endpoint layer already maps to 400.
 */
export function parseEnum<E extends EnumLike>(
  source: E,
  value: unknown,
  fieldName = "value"
): E[keyof E] {
  if (isEnumMember(source, value)) return value;

  throw new ValidationError(
    `${fieldName} must be one of: ${enumValues(source).join(", ")} (received ${JSON.stringify(value)})`
  );
}

/**
 * Declares that a model field holds a member of `source`.
 *
 * Legacy property decorator: `(prototype, propertyKey)`. There is no descriptor
 * for a plain field, so this records the rule against the prototype and
 * `validateEnums` checks it — a field decorator cannot intercept assignment
 * without replacing the property with an accessor, which would break Prisma's
 * object spreads.
 */
export function Enum<E extends EnumLike>(
  source: E,
  options: { optional?: boolean; name?: string } = {}
) {
  return function (prototype: object, propertyKey: string | symbol): void {
    const key = String(propertyKey);

    let rules = FIELDS.get(prototype);
    if (!rules) {
      rules = new Map();
      FIELDS.set(prototype, rules);
    }

    rules.set(key, {
      values: new Set(enumValues(source) as Array<string | number>),
      enumName: options.name ?? "enum",
      optional: options.optional ?? false,
    });
  };
}

/**
 * Validates every `@Enum`-declared field on an instance. Throws on the first
 * offender. Call it after constructing a model from untrusted input.
 */
export function validateEnums(instance: object): void {
  const rules = FIELDS.get(Object.getPrototypeOf(instance) as object);
  if (!rules) return;

  for (const [field, rule] of rules) {
    const value = (instance as Record<string, unknown>)[field];

    if (value === undefined || value === null) {
      if (rule.optional) continue;
      throw new ValidationError(`${field} is required`);
    }

    if (!rule.values.has(value as string | number)) {
      throw new ValidationError(
        `${field} must be one of: ${[...rule.values].join(", ")} (received ${JSON.stringify(value)})`
      );
    }
  }
}

/** Fields declared with `@Enum` on a model, for introspection and tests. */
export function enumFieldsOf(instance: object): string[] {
  const rules = FIELDS.get(Object.getPrototypeOf(instance) as object);
  return rules ? [...rules.keys()] : [];
}
