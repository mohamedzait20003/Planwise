import { SectionHeading } from "./section-heading";
import { Reveal } from "./motion-primitives";
import { LockDemo } from "./lock-demo";

export function LockingSection() {
  return (
    <section id="locking" className="scroll-mt-24 px-6 py-24">
      <SectionHeading eyebrow="Locking" title="A closed month stays closed">
        Locking is per <strong className="text-foreground">month</strong>, not
        per quarter — the finest granularity the data model has, so closing Q1 is
        just three locks. Once a month is locked, every plan and actual inside it
        is frozen.
      </SectionHeading>

      <div className="mx-auto mt-12 grid max-w-5xl items-center gap-10 lg:grid-cols-[1fr_1.05fr]">
        <Reveal className="space-y-4">
          <h3 className="text-xl font-semibold">
            Hiding the button is a courtesy
          </h3>
          <p className="text-base leading-relaxed text-pretty text-muted-foreground">
            The real enforcement lives in the API. Every write resolves its
            month first and rejects outright if that month is closed, so a
            request that never touches the UI is refused on exactly the same
            terms.
          </p>
          <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
            Try it — pick a month on the right and save. January is locked.
          </p>
        </Reveal>

        <Reveal delay={0.12}>
          <LockDemo />
        </Reveal>
      </div>
    </section>
  );
}
