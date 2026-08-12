import { handleCallback } from "@vercel/queue";

import { ReportServiceProvider } from "@/domain/services/reportService";
import { reportJobDto } from "@/domain/dtos/reportDto";

export const POST = handleCallback(
  async (message: unknown) => {
    const parsed = reportJobDto.safeParse(message);

    if (!parsed.success) {
      throw new Error(
        `Malformed report job: ${parsed.error.issues[0]?.message ?? "unknown"}`
      );
    }

    const { runId, userId } = parsed.data;
    const reports = ReportServiceProvider.get();

    try {
      await reports.fulfil(userId, runId);
    } catch (cause) {
      await reports.fail(
        runId,
        cause instanceof Error ? cause.message : "The report failed to generate"
      );
      throw cause;
    }
  },
  {
    visibilityTimeoutSeconds: 300,
  }
);
