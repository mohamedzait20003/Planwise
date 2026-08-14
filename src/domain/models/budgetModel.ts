import "server-only";

import { Model, toDTO, toMonthString } from "../decorators/model";
import type {
  Category as PrismaCategory,
  Plan as PrismaPlan,
  Actual as PrismaActual,
  PeriodLock as PrismaPeriodLock,
  Prisma,
} from "../../../generated/prisma/client";

/**
 * Models for the plan-vs-actual core.
 *
 * Two conversions happen here and nowhere else:
 *
 *  - `Prisma.Decimal` -> `number`. Decimal is not JSON-serializable, so an
 *    amount handed straight to a Client Component arrives as `{}`. Money is
 *    stored as Decimal(14,2) precisely so arithmetic is exact; it is converted
 *    only at the boundary, after the database has done the summing.
 *
 *  - `@db.Date` -> `"YYYY-MM"`. The column is a bare date pinned to the 1st.
 *    Formatting it with local getters would render 2026-01-01 as "2025-12" west
 *    of UTC, so `toMonthString` reads UTC parts.
 */

function decimalToNumber(value: Prisma.Decimal): number {
  return value.toNumber();
}

@Model<CategoryModel>({ name: "Category" })
export class CategoryModel {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly archivedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(row: PrismaCategory) {
    this.id = row.id;
    this.userId = row.userId;
    this.name = row.name;
    this.archivedAt = row.archivedAt;
    this.createdAt = row.createdAt;
    this.updatedAt = row.updatedAt;
  }

  /** Archived categories stay in historical reports but leave the pickers. */
  get isArchived(): boolean {
    return this.archivedAt !== null;
  }

  toJSON() {
    return toDTO(this);
  }
}

/** A monthly target. One per category per month — enforced by a unique index. */
@Model<PlanModel>({ name: "Plan", months: ["periodMonth"] })
export class PlanModel {
  readonly id: string;
  readonly userId: string;
  readonly categoryId: string;
  readonly periodMonth: Date;
  readonly amount: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(row: PrismaPlan) {
    this.id = row.id;
    this.userId = row.userId;
    this.categoryId = row.categoryId;
    this.periodMonth = row.periodMonth;
    this.amount = decimalToNumber(row.amount);
    this.createdAt = row.createdAt;
    this.updatedAt = row.updatedAt;
  }

  get month(): string {
    return toMonthString(this.periodMonth);
  }

  toJSON() {
    return toDTO(this);
  }
}

/**
 * A plan read together with its category's name.
 *
 * The report needs the name on every planned row and will not join for it per
 * row, so `listInRange` selects it alongside. A subclass rather than an
 * optional field on `PlanModel`: the name is either guaranteed by the query or
 * absent by the query, never sometimes-there, and a `string | undefined` would
 * push a fallback into the one consumer that always has it.
 */
@Model<PlanWithCategoryModel>({ name: "Plan", months: ["periodMonth"] })
export class PlanWithCategoryModel extends PlanModel {
  readonly categoryName: string;

  constructor(row: PrismaPlan & { category: { name: string } }) {
    super(row);
    this.categoryName = row.category.name;
  }
}

/**
 * A single logged spend. Unlike a plan there may be many per category-month —
 * actuals are a ledger, summed at report time, which is what makes the
 * drill-down view possible.
 */
@Model<ActualModel>({ name: "Actual", months: ["periodMonth"] })
export class ActualModel {
  readonly id: string;
  readonly userId: string;
  readonly categoryId: string;
  readonly periodMonth: Date;
  readonly amount: number;
  readonly note: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt: Date | null;

  constructor(row: PrismaActual) {
    this.id = row.id;
    this.userId = row.userId;
    this.categoryId = row.categoryId;
    this.periodMonth = row.periodMonth;
    this.amount = decimalToNumber(row.amount);
    this.note = row.note;
    this.createdAt = row.createdAt;
    this.updatedAt = row.updatedAt;
    this.deletedAt = row.deletedAt;
  }

  /** Removed, but still on the record — see the schema for why it is kept. */
  get isDeleted(): boolean {
    return this.deletedAt !== null;
  }

  get month(): string {
    return toMonthString(this.periodMonth);
  }

  toJSON() {
    return toDTO(this);
  }
}

/** A closed month. The row existing is the lock; absence means open. */
@Model<PeriodLockModel>({ name: "PeriodLock", months: ["periodMonth"] })
export class PeriodLockModel {
  readonly id: string;
  readonly userId: string;
  readonly periodMonth: Date;
  readonly lockedAt: Date;
  readonly note: string | null;

  constructor(row: PrismaPeriodLock) {
    this.id = row.id;
    this.userId = row.userId;
    this.periodMonth = row.periodMonth;
    this.lockedAt = row.lockedAt;
    this.note = row.note;
  }

  get month(): string {
    return toMonthString(this.periodMonth);
  }

  toJSON() {
    return toDTO(this);
  }
}

