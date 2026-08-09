import { LockIcon, TableIcon, TargetIcon, TrendingUpIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "./section-heading";
import { StaggerGroup, StaggerItem } from "./motion-primitives";

const steps = [
  {
    icon: TargetIcon,
    title: "Set the target",
    desc: "Give each category a monthly number. Marketing → January 2026 → $5,000.",
  },
  {
    icon: TableIcon,
    title: "Log what happened",
    desc: "Enter actuals by hand or drop in a CSV. Categories and months are validated on the way in.",
  },
  {
    icon: TrendingUpIcon,
    title: "Read the variance",
    desc: "Pick a range and see plan, actual, variance and variance % per category × month.",
  },
  {
    icon: LockIcon,
    title: "Close the period",
    desc: "Lock the month. Plans and actuals inside it become read-only for everyone.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-24 px-6 py-24">
      <SectionHeading
        eyebrow="How it works"
        title="Four steps, one number that matters"
      >
        No financial-planning background required — if you can fill in a
        spreadsheet row, you can run a variance report.
      </SectionHeading>

      <StaggerGroup className="mx-auto mt-14 grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(({ icon: Icon, title, desc }, i) => (
          <StaggerItem key={title}>
            <Card className="group h-full transition-all duration-300 hover:-translate-y-1 hover:ring-primary/25">
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15 transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="size-4.5" />
                  </span>
                  <span className="text-2xl font-semibold text-muted-foreground/25 tabular">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="font-medium">{title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {desc}
                </p>
              </CardContent>
            </Card>
          </StaggerItem>
        ))}
      </StaggerGroup>
    </section>
  );
}
