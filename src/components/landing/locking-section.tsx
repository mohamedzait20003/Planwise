import { LockIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "./section-heading";
import { Reveal } from "./motion-primitives";

const periods = [
  { label: "2026-01", state: "locked" as const },
  { label: "2026-02", state: "open" as const },
  { label: "2026-03", state: "open" as const },
];

export function LockingSection() {
  return (
    <section id="locking" className="scroll-mt-24 px-6 py-24">
      <SectionHeading eyebrow="Locking" title="A closed month stays closed">
        Locking is per <strong className="text-foreground">month</strong>, not
        per quarter — the finest granularity the data model has, so closing Q1 is
        just three locks. Once a month is locked, every plan and actual inside it
        is frozen.
      </SectionHeading>

      <Reveal delay={0.1} className="mx-auto mt-6 max-w-2xl text-center">
        <p className="text-base leading-relaxed text-pretty text-muted-foreground">
          The button disappears from the UI, but that is a courtesy. The real
          enforcement lives in the API, which rejects the write outright.
        </p>

        <div className="mt-9 flex flex-wrap justify-center gap-2">
          {periods.map(({ label, state }) =>
            state === "locked" ? (
              <Badge key={label} className="gap-1.5 bg-locked-muted text-locked">
                <LockIcon className="size-3" />
                {label} locked
              </Badge>
            ) : (
              <Badge key={label} variant="outline" className="gap-1.5">
                {label} open
              </Badge>
            )
          )}
        </div>
      </Reveal>
    </section>
  );
}
