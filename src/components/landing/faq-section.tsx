import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SectionHeading } from "./section-heading";
import { Reveal } from "./motion-primitives";

const faqs = [
  {
    q: "How is variance % calculated when the plan is zero?",
    a: "It isn't — there's no denominator, so the API returns null and the report shows N/A. Showing 0%, Infinity or NaN would all be lies of a different kind. The absolute variance is still shown, because that number is real.",
  },
  {
    q: "What happens to a category with no actual logged?",
    a: "The missing actual is treated as $0, so a $5,000 plan reads as −$5,000 / −100%. That keeps column totals additive and makes a forgotten entry loud instead of invisible. The row stays grey rather than green, though — coming in under plan is good news, but having no data isn't, and the colour shouldn't claim otherwise.",
  },
  {
    q: "Is locking per month or per quarter?",
    a: "Per month. It's the finest granularity the data model supports, and closing a quarter is just three month locks. A coarser lock would have made it impossible to reopen a single bad month.",
  },
  {
    q: "Can I edit a locked period through the API?",
    a: "No. Every write to a plan or actual resolves its month first and rejects with a PERIOD_LOCKED error if that month is closed. Hiding the buttons is presentation; the check is the product rule.",
  },
  {
    q: "Which sign means I overspent?",
    a: "Positive. Variance is actual − plan, so spending more than planned is a positive number shown in red, and coming in under plan is negative and shown in green. The colours never carry meaning on their own — the sign and the label do.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="scroll-mt-24 px-6 pt-24 pb-28">
      <SectionHeading eyebrow="FAQ" title="The edge cases, decided">
        Every ambiguous case got a documented answer rather than an accident.
      </SectionHeading>

      <Reveal className="mx-auto mt-12 max-w-3xl">
        <Accordion className="bg-card/50">
          {faqs.map(({ q, a }) => (
            <AccordionItem key={q} value={q}>
              <AccordionTrigger className="text-left hover:no-underline">
                {q}
              </AccordionTrigger>
              <AccordionContent className="leading-relaxed text-muted-foreground">
                {a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Reveal>
    </section>
  );
}
