/**
 * Stands in for the `server-only` package under Vitest.
 *
 * The real module throws on import unless it resolves through the
 * `react-server` condition, which is exactly what stops a server module being
 * pulled into a client bundle. A test runner is neither, so without this alias
 * every service and repository import fails before a single assertion runs.
 *
 * Empty on purpose — the guard has no runtime behaviour to reproduce.
 */
export {};
