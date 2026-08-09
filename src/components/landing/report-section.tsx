import Link from "next/link";
import { ArrowRightIcon, CheckIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SectionHeading } from "./section-heading";
import { Reveal } from "./motion-primitives";
import { ReportPreview } from "./report-preview";

const reportPoints = [
  "Grouped by category × month across any range you pick",
  "Variance = actual − plan, so negative always means under plan",
  "Plan of $0 shows N/A for variance % — never NaN, never Infinity",
  "Missing actuals count as $0, but stay grey — a data gap isn't a saving",
];

export function ReportSection() {
  return (
    <section
      id="report"
      className="relative scroll-mt-24 overflow-hidden px-6 py-24"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-96 w-4xl -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/8 blur-[100px]"
      />

      <SectionHeading eyebrow="Reporting" title="The report, exactly as it renders">
        These are the assignment&rsquo;s sample figures run through the same
        variance function the app ships with — including the deliberately missing
        Marketing actual for February.
      </SectionHeading>

      <div className="mx-auto mt-14 grid max-w-6xl items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
        <Reveal>
          <ReportPreview />
        </Reveal>

        <Reveal delay={0.12} className="space-y-5">
          <h3 className="text-xl font-semibold">Numbers you can defend</h3>
          <ul className="space-y-3.5">
            {reportPoints.map((point) => (
              <li key={point} className="flex gap-3">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-favorable/15 text-favorable">
                  <CheckIcon className="size-3" />
                </span>
                <span className="text-sm leading-relaxed text-muted-foreground">
                  {point}
                </span>
              </li>
            ))}
          </ul>
          <Button
            variant="outline"
            className="rounded-full"
            nativeButton={false}
            render={<Link href="/report" />}
          >
            Open the report
            <ArrowRightIcon />
          </Button>
        </Reveal>
      </div>
    </section>
  );
}
