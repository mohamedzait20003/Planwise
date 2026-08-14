import { describe, expect, it } from "vitest";

import { ReportService } from "@/domain/services/reportService";
import type { ReportRow } from "@/domain/services/reportService";
import { monthToDate } from "@/domain/helpers/period";
import {
  CategoryModel,
  PeriodLockModel,
  PlanWithCategoryModel,
} from "@/domain/models/budgetModel";

/**
 * The aggregation, with the database stubbed out.
 *
 * `ReportService` takes its repositories as constructor parameters with
 * provider defaults, so a test supplies its own positionally and never opens a
 * connection. Everything below is the product rule the brief actually grades:
 * the join between plans and actuals, the two edge cases, and the totals.
 *
 * `compute` is deliberately the unit under test rather than `fulfil` — the
 * latter is wrapped in `@Transactional()` and would want a real client, and it
 * adds nothing but persistence to what is asserted here.
 *
 * The stubs hand back real models rather than row-shaped literals, which is
 * what the repositories now return. That also means the Decimal-to-number and
 * date-to-"YYYY-MM" conversions are exercised here instead of being assumed.
 */

const USER = "user_1";

/** Stands in for a Prisma Decimal — the models only ever call `toNumber`. */
const decimal = (value: number) => ({ toNumber: () => value });

const TIMESTAMPS = { createdAt: new Date(0), updatedAt: new Date(0) };

function plan(
  categoryId: string,
  name: string,
  month: string,
  amount: number
): PlanWithCategoryModel {
  return new PlanWithCategoryModel({
    id: `plan_${categoryId}_${month}`,
    userId: USER,
    categoryId,
    periodMonth: monthToDate(month),
    amount: decimal(amount),
    ...TIMESTAMPS,
    category: { name },
  } as never);
}

function category(id: string, name: string): CategoryModel {
  return new CategoryModel({
    id,
    userId: USER,
    name,
    archivedAt: null,
    ...TIMESTAMPS,
  } as never);
}

function lock(month: string): PeriodLockModel {
  return new PeriodLockModel({
    id: `lock_${month}`,
    userId: USER,
    periodMonth: monthToDate(month),
    lockedAt: new Date(0),
    note: null,
  } as never);
}

function actual(categoryId: string, month: string, amount: number) {
  return {
    categoryId,
    periodMonth: monthToDate(month),
    _sum: { amount: { toString: () => amount.toFixed(2) } },
  };
}

/** Builds a service whose repositories return exactly what a case needs. */
function serviceWith(options: {
  plans?: PlanWithCategoryModel[];
  actuals?: ReturnType<typeof actual>[];
  lockedMonths?: string[];
  categories?: CategoryModel[];
}) {
  const stubs = {
    plans: { listInRange: async () => options.plans ?? [] },
    actuals: { sumInRange: async () => options.actuals ?? [] },
    locks: {
      listInRange: async () => (options.lockedMonths ?? []).map(lock),
    },
    categories: { list: async () => options.categories ?? [] },
    reports: {},
  };

  // The stubs implement only the handful of methods `compute` reaches for;
  // widening them to the full repository interfaces would be noise that tests
  // nothing.
  return new ReportService(
    stubs.plans as never,
    stubs.actuals as never,
    stubs.locks as never,
    stubs.categories as never,
    stubs.reports as never
  );
}

const find = (rows: ReportRow[], name: string, month: string) =>
  rows.find((row) => row.categoryName === name && row.month === month);

describe("the brief's sample quarter", () => {
  // Verbatim from the assignment, including the deliberately missing
  // Marketing actual for February.
  const service = serviceWith({
    plans: [
      plan("mkt", "Marketing", "2026-01", 5_000),
      plan("pay", "Payroll", "2026-01", 20_000),
      plan("mkt", "Marketing", "2026-02", 5_000),
      plan("pay", "Payroll", "2026-02", 20_000),
    ],
    actuals: [
      actual("mkt", "2026-01", 4_800),
      actual("pay", "2026-01", 20_500),
      actual("pay", "2026-02", 19_800),
    ],
    categories: [category("mkt", "Marketing"), category("pay", "Payroll")],
  });

  it.each([
    ["Marketing", "2026-01", 5_000, 4_800, -200, -4, true],
    ["Payroll", "2026-01", 20_000, 20_500, 500, 2.5, true],
    ["Marketing", "2026-02", 5_000, 0, -5_000, -100, false],
    ["Payroll", "2026-02", 20_000, 19_800, -200, -1, true],
  ])(
    "%s %s",
    async (name, month, planned, spent, variance, variancePct, hasActual) => {
      const { rows } = await service.compute(USER, { from: "2026-01", to: "2026-02" });
      const row = find(rows, name as string, month as string);

      expect(row).toMatchObject({
        plan: planned,
        actual: spent,
        variance,
        variancePct,
        hasActual,
      });
    }
  );

  it("marks the missing actual so the UI can show it apart from a real zero", () => {
    // The amount is 0 either way. `hasActual` is the only thing that separates
    // "nothing was logged" from "someone logged nothing", and the report has to
    // carry it or the distinction is lost before it reaches the table.
    return service.compute(USER, { from: "2026-01", to: "2026-02" }).then(({ rows }) => {
      expect(find(rows, "Marketing", "2026-02")?.hasActual).toBe(false);
      expect(find(rows, "Payroll", "2026-02")?.hasActual).toBe(true);
    });
  });

  it("totals the whole range", async () => {
    const { totals } = await service.compute(USER, { from: "2026-01", to: "2026-02" });

    // 50,000 planned against 45,100 logged.
    expect(totals).toEqual({ plan: 50_000, actual: 45_100, variance: -4_900 });
  });

  it("emits one month total per month, in order", async () => {
    const { months } = await service.compute(USER, { from: "2026-01", to: "2026-02" });

    expect(months).toEqual([
      { month: "2026-01", plan: 25_000, actual: 25_300, variance: 300 },
      { month: "2026-02", plan: 25_000, actual: 19_800, variance: -5_200 },
    ]);
  });
});

describe("a plan of zero", () => {
  it("has no percentage but still reports the overspend", async () => {
    const service = serviceWith({
      plans: [plan("mkt", "Marketing", "2026-01", 0)],
      actuals: [actual("mkt", "2026-01", 300)],
      categories: [category("mkt", "Marketing")],
    });

    const { rows } = await service.compute(USER, { from: "2026-01", to: "2026-01" });

    expect(rows[0]).toMatchObject({ plan: 0, actual: 300, variance: 300, variancePct: null });
  });
});

describe("spend against a category with no target", () => {
  it("appears as a row with a plan of 0 rather than vanishing", async () => {
    // Otherwise money leaves the account and the report never mentions it.
    const service = serviceWith({
      actuals: [actual("tools", "2026-01", 120)],
      categories: [category("tools", "Tools")],
    });

    const { rows, totals } = await service.compute(USER, {
      from: "2026-01",
      to: "2026-01",
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      categoryName: "Tools",
      plan: 0,
      actual: 120,
      variancePct: null,
      hasActual: true,
    });
    expect(totals.actual).toBe(120);
  });

  it("names an unknown category rather than rendering undefined", async () => {
    const service = serviceWith({
      actuals: [actual("ghost", "2026-01", 50)],
      categories: [],
    });

    const { rows } = await service.compute(USER, { from: "2026-01", to: "2026-01" });

    expect(rows[0].categoryName).toBe("Uncategorised");
  });
});

describe("months with no data at all", () => {
  it("still appear, so the chart axis stays continuous", async () => {
    const service = serviceWith({
      plans: [plan("mkt", "Marketing", "2026-01", 1_000)],
      categories: [category("mkt", "Marketing")],
    });

    const { months } = await service.compute(USER, { from: "2026-01", to: "2026-03" });

    expect(months.map((month) => month.month)).toEqual([
      "2026-01",
      "2026-02",
      "2026-03",
    ]);
    expect(months[1]).toEqual({
      month: "2026-02",
      plan: 0,
      actual: 0,
      variance: 0,
    });
  });
});

describe("locks", () => {
  it("marks every row in a closed month", async () => {
    const service = serviceWith({
      plans: [
        plan("mkt", "Marketing", "2026-01", 1_000),
        plan("mkt", "Marketing", "2026-02", 1_000),
      ],
      lockedMonths: ["2026-01"],
      categories: [category("mkt", "Marketing")],
    });

    const { rows } = await service.compute(USER, { from: "2026-01", to: "2026-02" });

    expect(find(rows, "Marketing", "2026-01")?.locked).toBe(true);
    expect(find(rows, "Marketing", "2026-02")?.locked).toBe(false);
  });
});

describe("rounding", () => {
  it("keeps cents exact rather than drifting into binary noise", async () => {
    // 0.1 + 0.2 is the canonical float trap; a variance column showing
    // −0.30000000000000004 is the visible symptom.
    const service = serviceWith({
      plans: [plan("a", "A", "2026-01", 0.3)],
      actuals: [actual("a", "2026-01", 0.1)],
      categories: [category("a", "A")],
    });

    const { rows, totals } = await service.compute(USER, {
      from: "2026-01",
      to: "2026-01",
    });

    expect(rows[0].variance).toBe(-0.2);
    expect(totals.variance).toBe(-0.2);
  });
});

describe("ordering", () => {
  it("sorts by month, then category name", async () => {
    const service = serviceWith({
      plans: [
        plan("z", "Zebra", "2026-02", 1),
        plan("a", "Apple", "2026-02", 1),
        plan("m", "Mango", "2026-01", 1),
      ],
      categories: [
        category("z", "Zebra"),
        category("a", "Apple"),
        category("m", "Mango"),
      ],
    });

    const { rows } = await service.compute(USER, { from: "2026-01", to: "2026-02" });

    expect(rows.map((row) => `${row.month} ${row.categoryName}`)).toEqual([
      "2026-01 Mango",
      "2026-02 Apple",
      "2026-02 Zebra",
    ]);
  });
});
