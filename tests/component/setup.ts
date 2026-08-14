import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

/**
 * Shared setup for the component layer.
 *
 * `cleanup` unmounts between tests. Without it every render stacks in the same
 * document and a query like `getByRole("button")` starts failing with "found
 * multiple" halfway down a file — which reads as a broken test rather than a
 * leaked one.
 */
afterEach(cleanup);
