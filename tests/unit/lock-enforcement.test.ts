import { describe, expect, it, vi } from "vitest";

/**
 * Lock enforcement, with the database stubbed out.
 *
 * The brief asks specifically that the *API* refuse writes to a closed month
 * rather than the UI hide the buttons, so the rule is asserted where it lives:
 * inside the services, which is the layer every route, the CSV importer and any
 * future caller all pass through.
 *
 * Two things make this runnable without Postgres. The services take their
 * repositories as constructor parameters with provider defaults, so a test
 * supplies its own positionally. And `@Transactional` joins an existing
 * transaction rather than opening one — mocking the Prisma module so
 * `$transaction` simply invokes its callback means the decorated methods run
 * their real bodies with no connection behind them.
 *
 * The cases below are the ones a naive implementation gets wrong. Checking the
 * month the *request* names is easy; checking the month the *stored row* is in,
 * and checking both ends of a move, is what stops a closed month being emptied
 * by a caller who simply omits it from the payload.
 */

vi.mock("@/domain/infra/prisma", () => ({
  default: {
    $transaction: async (run: (tx: unknown) => Promise<unknown>) => run({}),
  },
}));

const { LockService } = await import("@/domain/services/lockService");
const { PlanService } = await import("@/domain/services/planService");
const { ActualService } = await import("@/domain/services/actualService");
const { PeriodLockedError } = await import("@/domain/decorators/global");
const { monthToDate } = await import("@/domain/helpers/period");
const { ActualModel, PlanModel } = await import("@/domain/models/budgetModel");

const USER = "user_1";
const CATEGORY = "cat_marketing";

/** Stands in for a Prisma Decimal — the models only ever call `toNumber`. */
const decimal = (value: number) => ({ toNumber: () => value });
const TIMESTAMPS = { createdAt: new Date(0), updatedAt: new Date(0) };

/**
 * Stored rows come back from the repositories as models, so the stubs return
 * models too. That matters here specifically: the services read the month off
 * `.month`, which is the model's own UTC-safe accessor — a row-shaped literal
 * would hand them `undefined` and every lock check would pass by accident.
 */
function storedPlan(month: string) {
  return new PlanModel({
    id: "plan_1",
    userId: USER,
    categoryId: CATEGORY,
    periodMonth: monthToDate(month),
    amount: decimal(5_000),
    ...TIMESTAMPS,
  } as never);
}

function storedActual(month: string) {
  return new ActualModel({
    id: "actual_1",
    userId: USER,
    categoryId: CATEGORY,
    periodMonth: monthToDate(month),
    amount: decimal(100),
    note: null,
    ...TIMESTAMPS,
  } as never);
}

/**
 * A lock service that considers exactly `locked` closed and nothing else.
 *
 * Only the two methods these paths reach are stubbed, so the casts are what
 * stand in for the rest of each repository's surface.
 */
type LockDeps = ConstructorParameters<typeof LockService>;

function locksFor(locked: string[]) {
  return new LockService(
    {
      isLocked: async (_user: string, month: string) => locked.includes(month),
    } as unknown as LockDeps[0],
    { bumpDataVersion: async () => undefined } as unknown as LockDeps[1]
  );
}

/** Records what actually reached the repository, so "refused" can be proven. */
function spyRepo() {
  return {
    upsert: vi.fn(async () => ({ id: "plan_1" })),
    delete: vi.fn(async () => true),
    create: vi.fn(async () => ({ id: "actual_1" })),
    update: vi.fn(async () => ({ id: "actual_1" })),
    createMany: vi.fn(async (rows: unknown[]) => rows.length),
  };
}

const writableCategories = {
  requireWritable: async () => undefined,
} as unknown as ConstructorParameters<typeof PlanService>[1];

const noReports = { bumpDataVersion: async () => undefined };

/* ------------------------------------------------------------- the primitive */

describe("LockService.assertOpen", () => {
  it("throws PeriodLockedError for a closed month", async () => {
    const locks = locksFor(["2026-01"]);

    await expect(locks.assertOpen(USER, "2026-01")).rejects.toThrow(
      PeriodLockedError
    );
  });

  it("resolves for an open month", async () => {
    const locks = locksFor(["2026-01"]);

    await expect(locks.assertOpen(USER, "2026-02")).resolves.toBeUndefined();
  });

  it("names the month, so the message can be shown as-is", async () => {
    const locks = locksFor(["2026-01"]);

    await expect(locks.assertOpen(USER, "2026-01")).rejects.toThrow("2026-01");
  });
});

/* ------------------------------------------------------------------- plans */

describe("PlanService", () => {
  function planService(locked: string[], repo = spyRepo()) {
    const service = new PlanService(
      repo as unknown as ConstructorParameters<typeof PlanService>[0],
      writableCategories,
      locksFor(locked),
      noReports as unknown as ConstructorParameters<typeof PlanService>[3]
    );
    return { service, repo };
  }

  it("refuses a target in a closed month", async () => {
    const { service, repo } = planService(["2026-01"]);

    await expect(
      service.upsert(USER, { categoryId: CATEGORY, month: "2026-01", amount: 5000 })
    ).rejects.toThrow(PeriodLockedError);

    // The point of the rule: nothing was written, not merely reported.
    expect(repo.upsert).not.toHaveBeenCalled();
  });

  it("allows a target in an open month", async () => {
    const { service, repo } = planService(["2026-01"]);

    await service.upsert(USER, {
      categoryId: CATEGORY,
      month: "2026-02",
      amount: 5000,
    });

    expect(repo.upsert).toHaveBeenCalledOnce();
  });

  it("reads the month off the stored row when deleting", async () => {
    // The request carries only an id. A check against a client-supplied month
    // would pass here, because there is no month in the request to check.
    const repo = {
      ...spyRepo(),
      findById: async () => storedPlan("2026-01"),
    };
    const { service } = planService(["2026-01"], repo);

    await expect(service.delete(USER, "plan_1")).rejects.toThrow(
      PeriodLockedError
    );
    expect(repo.delete).not.toHaveBeenCalled();
  });
});

/* ----------------------------------------------------------------- actuals */

describe("ActualService", () => {
  function actualService(locked: string[], overrides: Record<string, unknown> = {}) {
    const repo = { ...spyRepo(), ...overrides };
    const service = new ActualService(
      repo as unknown as ConstructorParameters<typeof ActualService>[0],
      {} as ConstructorParameters<typeof ActualService>[1],
      writableCategories as unknown as ConstructorParameters<typeof ActualService>[2],
      locksFor(locked),
      noReports as unknown as ConstructorParameters<typeof ActualService>[4]
    );
    return { service, repo };
  }

  it("refuses an entry in a closed month", async () => {
    const { service, repo } = actualService(["2026-01"]);

    await expect(
      service.create(USER, { categoryId: CATEGORY, month: "2026-01", amount: 100 })
    ).rejects.toThrow(PeriodLockedError);

    expect(repo.create).not.toHaveBeenCalled();
  });

  it("refuses an edit to an entry stored in a closed month", async () => {
    const { service, repo } = actualService(["2026-01"], {
      findById: async () => storedActual("2026-01"),
    });

    await expect(
      service.update(USER, "actual_1", { amount: 999 })
    ).rejects.toThrow(PeriodLockedError);

    expect(repo.update).not.toHaveBeenCalled();
  });

  it("refuses moving an entry INTO a closed month", async () => {
    const { service, repo } = actualService(["2026-01"], {
      findById: async () => storedActual("2026-02"),
    });

    await expect(
      service.update(USER, "actual_1", { month: "2026-01" })
    ).rejects.toThrow(PeriodLockedError);

    expect(repo.update).not.toHaveBeenCalled();
  });

  it("refuses moving an entry OUT of a closed month", async () => {
    // The naive check — validate only the month in the payload — passes this
    // request, and a closed month can then be emptied one row at a time.
    const { service, repo } = actualService(["2026-01"], {
      findById: async () => storedActual("2026-01"),
    });

    await expect(
      service.update(USER, "actual_1", { month: "2026-02" })
    ).rejects.toThrow(PeriodLockedError);

    expect(repo.update).not.toHaveBeenCalled();
  });

  it("allows a move between two open months", async () => {
    const { service, repo } = actualService(["2026-01"], {
      findById: async () => storedActual("2026-02"),
    });

    await service.update(USER, "actual_1", { month: "2026-03" });

    expect(repo.update).toHaveBeenCalledOnce();
  });

  it("reads the month off the stored row when deleting", async () => {
    const { service, repo } = actualService(["2026-01"], {
      findById: async () => storedActual("2026-01"),
    });

    await expect(service.delete(USER, "actual_1")).rejects.toThrow(
      PeriodLockedError
    );
    expect(repo.delete).not.toHaveBeenCalled();
  });
});

/* -------------------------------------------------------------- CSV import */

describe("CSV import against a locked month", () => {
  it("rejects only the locked rows and still lands the rest", async () => {
    const repo = spyRepo();
    const service = new ActualService(
      repo as unknown as ConstructorParameters<typeof ActualService>[0],
      {
        findByNames: async () => [{ id: CATEGORY, name: "Marketing" }],
      } as unknown as ConstructorParameters<typeof ActualService>[1],
      writableCategories as unknown as ConstructorParameters<typeof ActualService>[2],
      locksFor(["2026-01"]),
      noReports as unknown as ConstructorParameters<typeof ActualService>[4]
    );

    const csv = [
      "month,category,amount",
      "2026-01,Marketing,100", // locked — refused
      "2026-02,Marketing,200",
      "2026-03,Marketing,300",
    ].join("\n");

    const result = await service.importCsv(USER, csv);

    expect(result.accepted).toBe(2);
    expect(result.rejected).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].line).toBe(2);
    expect(result.errors[0].reason).toContain("locked");

    // The two open months were written in one call; the locked one never made
    // it into the batch.
    expect(repo.createMany).toHaveBeenCalledOnce();
    expect(repo.createMany.mock.calls[0][0]).toHaveLength(2);
  });
});
