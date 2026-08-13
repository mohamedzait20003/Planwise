import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SectionHeading } from "./section-heading";
import { Reveal } from "./motion-primitives";

/**
 * Grouped rather than a single run of questions: the reader arrives with one
 * of four concerns, and a flat list of fourteen makes them read all fourteen
 * to find out which one they had.
 */
const groups = [
  {
    label: "The numbers",
    faqs: [
      {
        q: "Which sign means I overspent?",
        a: "Positive. Variance is actual − plan, so spending more than planned is a positive number shown in red, and coming in under plan is negative and shown in green. The colours never carry meaning on their own — the sign and the label do.",
      },
      {
        q: "How is variance % calculated when the plan is zero?",
        a: "It isn't — there's no denominator, so the API returns null and the report shows N/A. Showing 0%, Infinity or NaN would all be lies of a different kind. The absolute variance is still shown, because that number is real.",
      },
      {
        q: "What happens to a category with no actual logged?",
        a: "The missing actual is treated as $0, so a $5,000 plan reads as −$5,000 / −100%. That keeps column totals additive and makes a forgotten entry loud instead of invisible. The row stays grey rather than green, though — coming in under plan is good news, but having no data isn't, and the colour shouldn't claim otherwise.",
      },
      {
        q: "Is the variance % on a total the average of its rows?",
        a: "No. Every percentage is computed from the totals it sits beside — total actual minus total plan, over total plan. Averaging row percentages would let a $50 category swing a quarter as hard as a $50,000 one.",
      },
      {
        q: "Can a category appear in the report with no plan at all?",
        a: "Yes, if you logged spend against it. Plan reads $0, variance is the full actual, and variance % is N/A for the same reason as above. Unbudgeted spend is exactly the thing you want the report to surface, so it is never dropped.",
      },
    ],
  },
  {
    label: "Locking periods",
    faqs: [
      {
        q: "Is locking per month or per quarter?",
        a: "Per month. It's the finest granularity the data model supports, and closing a quarter is just three month locks. A coarser lock would have made it impossible to reopen a single bad month.",
      },
      {
        q: "Can I edit a locked period through the API?",
        a: "No. Every write to a plan or actual resolves its month first and rejects with a PERIOD_LOCKED error if that month is closed. Hiding the buttons is presentation; the check is the product rule.",
      },
      {
        q: "Can I reopen a month after locking it?",
        a: "Yes — unlocking is its own action on the Periods screen, and it puts the month straight back into edit. Locking is meant to stop accidents, not to punish you for one, so a wrong lock is a click to undo rather than a permanent record.",
      },
      {
        q: "Does locking a month change any numbers?",
        a: "Not one. A lock only changes what may be written; everything already recorded reads exactly the same before and after. That is the point — a closed month should report the same figure next year as it does today.",
      },
    ],
  },
  {
    label: "Categories and data",
    faqs: [
      {
        q: "What happens when I archive a category?",
        a: "It disappears from the plans grid and the entry form, so nothing new can be filed against it, and the API refuses a plan or actual that names it. Every plan and actual already recorded stays exactly where it was, and past reports keep the same numbers they always had.",
      },
      {
        q: "Does an archived category still show up in reports?",
        a: "If it has spend or a plan in the range you asked for, yes — under its own name. Dropping it would silently change the totals for a quarter you already closed, which is the one thing archiving must never do.",
      },
      {
        q: "If I rename a category, does its history follow?",
        a: "Yes. Plans and actuals reference the category by id, not by name, so a rename is cosmetic and every historical row comes with it. Old reports re-render under the new name.",
      },
      {
        q: "What does the CSV need to look like?",
        a: "Three columns — month, category, amount — with month as YYYY-MM and category matching one of your existing category names. Anything else is reported rather than guessed at.",
      },
      {
        q: "What happens to rows that fail validation?",
        a: "The good rows still land and the bad ones come back with a reason each. A forty-row file with two bad lines imports thirty-eight and tells you which two failed and why. Rejecting the whole file would make you hunt for a problem the importer had already found.",
      },
    ],
  },
  {
    label: "Using Planwise",
    faqs: [
      {
        q: "Does a report generate instantly?",
        a: "It's queued. Opening the report screen never starts work on its own — you ask for a run, and the screen shows it as pending, then processing, then the finished figures, polling until it lands. Large ranges stay responsive that way instead of holding a request open.",
      },
      {
        q: "Can I get the numbers out?",
        a: "Yes — a report exports to CSV as one row per category × month, carrying month, category, plan, actual, variance, variance % and whether that month was locked. A missing actual and an undefined variance % come out as empty cells rather than zeros, so a spreadsheet averages what is really there instead of counting the gaps as data.",
      },
      {
        q: "Who can see my data?",
        a: "Only you. Categories, plans, actuals and locks are all scoped to your account at the query level, not filtered in the UI — a request for someone else's row comes back empty rather than forbidden.",
      },
      {
        q: "What does it cost?",
        a: "Nothing. There are no tiers, no seat counts and no card required — it was built as a plan-vs-actual tracking exercise, and it stays free to use.",
      },
    ],
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="scroll-mt-24 px-6 pt-24 pb-28">
      <SectionHeading eyebrow="FAQ" title="The edge cases, decided">
        Every ambiguous case got a documented answer rather than an accident.
      </SectionHeading>

      <div className="mx-auto mt-12 max-w-3xl space-y-8">
        {groups.map(({ label, faqs }, i) => (
          <Reveal key={label} delay={i * 0.06} className="space-y-3">
            <h3 className="flex items-center gap-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {label}
              <span aria-hidden className="h-px flex-1 bg-border" />
              <span aria-hidden className="tabular">
                {faqs.length}
              </span>
            </h3>

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
        ))}
      </div>
    </section>
  );
}
