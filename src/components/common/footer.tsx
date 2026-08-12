import { Logo } from "@/components/common/logo";
import { Separator } from "@/components/ui/separator";

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-border bg-card/40">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-64 w-216 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <Logo markClassName="size-7" />
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              Monthly targets, real spend, and the variance between them — with
              periods you can close for good.
            </p>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Planwise. Built as a plan-vs-actual
            tracking exercise.
          </p>
        </div>
      </div>
    </footer>
  );
}
