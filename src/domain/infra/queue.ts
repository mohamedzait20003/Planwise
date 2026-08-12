import "server-only";

import { send } from "@vercel/queue";

import type { ReportJobDto } from "../dtos/reportDto";

/**
 * The report work queue.
 *
 * Report generation is off the request path because the cost scales with the
 * range: a ten-year query is a hundred and twenty months across every category,
 * and a user who asks for it should not be holding an HTTP connection open
 * while it runs. The request claims a run, drops a message, and answers 202;
 * the consumer computes and stores the result.
 *
 * Topic names are `[A-Za-z0-9_-]+` — the SDK rejects anything else. This one
 * must match the `topic` in `vercel.json`, which is what binds it to
 * `src/app/api/queues/report/route.ts`; they are two halves of one wire and
 * changing either alone stops delivery without an error.
 */
export const REPORT_TOPIC = "planwise-report";

/**
 * Set to run the computation inline instead of queueing it.
 *
 * Not normally needed: in development the SDK sends to the real queue service
 * and then invokes the handler in-process, discovering it from `vercel.json`.
 * That still wants a linked Vercel project and network, so this is the escape
 * hatch for working offline or before the project is linked.
 *
 * Explicitly opt-in rather than sniffed from `process.env.VERCEL`, so a
 * misconfigured deployment fails loudly instead of quietly serving every report
 * from the request thread.
 */
export function inlineReports(): boolean {
  return process.env.REPORTS_INLINE === "1";
}

export async function enqueueReport(job: ReportJobDto): Promise<void> {
  await send(REPORT_TOPIC, job);
}
