/**
 * React Query hooks over the handlers.
 *
 * Flattened, unlike the handlers: hook names are already unique by convention
 * (`useCreateActual`, `useDeleteActual`), so a namespace would only add noise
 * at the call site.
 */

export * from "./auth";
export * from "./categories";
export * from "./plans";
export * from "./actuals";
export * from "./locks";
export * from "./report";
export * from "./admin";
