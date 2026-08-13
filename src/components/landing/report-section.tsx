import { CheckIcon } from "lucide-react";

import { SectionHeading } from "./section-heading";
import { Reveal } from "./motion-primitives";
import { ReportPreview } from "./report-preview";

const reportPoints = [
  {
    title: "One row per category × month",
    body: "Across whatever range you pick. Nothing is rolled up until you ask for it.",
  },
  {
    title: "Variance = actual − plan",
    body: "So the sign never flips meaning between screens: negative is under plan, positive is over.",
  },
  {
    title: "A $0 plan shows N/A, not NaN",
    body: "There is no denominator, so there is no percentage. The absolute variance is still shown, because that number is real.",
  },
  {
    title: "A missing actual counts as $0 — in grey",
    body: "Totals stay additive and a forgotten entry stays loud, but it is never painted green. A data gap is not a saving.",
  },
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

        <Reveal delay={0.12} className="space-y-6">
          <h3 className="text-xl font-semibold">Numbers you can defend</h3>
          <ul className="space-y-5">
            {reportPoints.map(({ title, body }) => (
              <li key={title} className="flex gap-3">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-favorable/15 text-favorable">
                  <CheckIcon aria-hidden className="size-3" />
                </span>
                <div className="space-y-1">
                  <p className="text-sm font-medium">{title}</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
