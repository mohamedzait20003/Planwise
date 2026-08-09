"use client";

import { motion } from "framer-motion";
import { CheckIcon, FileSpreadsheetIcon, XIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "./section-heading";
import { Reveal } from "./motion-primitives";
import { cn } from "@/lib/utils/utils";

const csvLines = [
  { text: "month,category,amount", kind: "head" as const },
  { text: "2026-01,Marketing,4800", kind: "ok" as const },
  { text: "2026-01,Payroll,20500", kind: "ok" as const },
  { text: "2026-02,Payroll,19800", kind: "ok" as const },
  {
    text: "2026-13,Marketing,900",
    kind: "bad" as const,
    why: "month must be YYYY-MM",
  },
  {
    text: "2026-02,Markting,700",
    kind: "bad" as const,
    why: "unknown category",
  },
];

export function ImportSection() {
  return (
    <section id="import" className="scroll-mt-24 px-6 py-24">
      <SectionHeading eyebrow="Import" title="Paste a quarter in one go">
        Upload a CSV of actuals. Every row is checked for month format and a
        known category before anything is written — bad rows are reported, not
        silently dropped.
      </SectionHeading>

      <Reveal className="mx-auto mt-12 max-w-2xl">
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-4 pb-3">
            <FileSpreadsheetIcon className="size-3.5 text-primary" />
            <span className="text-xs font-medium">actuals-q1-2026.csv</span>
            <Badge variant="secondary" className="ml-auto h-5 text-[10px]">
              4 of 6 rows valid
            </Badge>
          </div>
          <CardContent className="space-y-1 font-mono text-xs">
            {csvLines.map(({ text, kind, why }, i) => (
              <motion.div
                key={text}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2.5 py-1.5",
                  kind === "head" && "text-muted-foreground",
                  kind === "ok" && "bg-favorable/8",
                  kind === "bad" && "bg-unfavorable/10"
                )}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <span className="w-4 shrink-0">
                  {kind === "ok" && (
                    <CheckIcon className="size-3 text-favorable" />
                  )}
                  {kind === "bad" && <XIcon className="size-3 text-unfavorable" />}
                </span>
                <span className={cn(kind === "bad" && "text-unfavorable")}>
                  {text}
                </span>
                {why && (
                  <span className="ml-auto font-sans text-[10px] text-unfavorable">
                    {why}
                  </span>
                )}
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </Reveal>
    </section>
  );
}
