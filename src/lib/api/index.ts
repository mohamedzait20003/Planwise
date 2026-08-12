/**
 * The transport layer: the axios instance, the wire types both sides agree on,
 * and the react-query keys.
 *
 * Request functions live in `@/lib/handlers` and their react-query wrappers in
 * `@/lib/hooks`. Handlers are kept out of this module so the request logic
 * stays callable without a query client — from a server action, a script, or a
 * test — and so importing a hook does not drag React Query into a module that
 * only needed the fetch.
 */

export { baseApi } from "./baseApi";
export { ApiError, authError } from "./apiError";
export * from "./types";
export * from "./keys";
