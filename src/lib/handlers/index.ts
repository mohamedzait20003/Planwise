/**
 * Request handlers — plain async functions, one file per resource.
 *
 * Namespaced rather than flattened, because several resources have a `get`,
 * `create` and `delete`: `plansApi.deletePlan` reads unambiguously where a bare
 * `deletePlan` beside `deleteActual` does not.
 */

export * as authApi from "./auth";
export * as categoriesApi from "./categories";
export * as plansApi from "./plans";
export * as actualsApi from "./actuals";
export * as locksApi from "./locks";
export * as reportApi from "./report";
export * as adminApi from "./admin";
