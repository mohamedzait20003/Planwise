import Link from "next/link";
import { ArrowUpRightIcon, LockIcon } from "lucide-react";

import { Logo } from "@/components/common/logo";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils/utils";

/**
 * The site footer.
 *
 * Deliberately a Server Component with no session in it, unlike the nav. A
 * footer that reshuffled its columns once the session resolved would shift the
 * page under whoever had just scrolled to it, and the links it would swap
 * between are reachable either way — `proxy.ts` sends a signed-out visitor
 * clicking "Dashboard" to sign-in and back again, which is a better answer than
 * hiding the link.
 *
 * Every href here resolves to something that exists: the product column points
 * at the landing sections' own ids, and the workspace column at real routes.
 */

const REPO = "https://github.com/mohamedzait20003/Planwise";

type FooterLink = { href: string; label: string; external?: boolean };

const product: FooterLink[] = [
  { href: "/#how", label: "How it works" },
  { href: "/#report", label: "Reports" },
  { href: "/#locking", label: "Locking periods" },
  { href: "/#import", label: "CSV import" },
  { href: "/#faq", label: "FAQ" },
];

const workspace: FooterLink[] = [
  { href: "/client/dashboard", label: "Dashboard" },
  { href: "/client/plans", label: "Targets" },
  { href: "/client/actuals", label: "Entries" },
  { href: "/client/report", label: "Report" },
  { href: "/client/periods", label: "Periods" },
];

const project: FooterLink[] = [
  { href: REPO, label: "Source", external: true },
  { href: `${REPO}#readme`, label: "README", external: true },
  {
    href: `${REPO}/blob/main/docs/ARCHITECTURE.md`,
    label: "Architecture",
    external: true,
  },
  {
    href: `${REPO}/blob/main/docs/DECISION.md`,
    label: "Decisions",
    external: true,
  },
];

/** The official mark. Lucide dropped brand icons, so it is inlined. */
function GithubMark({ className }: Readonly<{ className?: string }>) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={cn("size-4", className)} fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

function FooterColumn({
  title,
  links,
}: Readonly<{ title: string; links: FooterLink[] }>) {
  return (
    <nav aria-label={title}>
      <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {title}
      </h2>

      <ul className="mt-3 space-y-0.5">
        {links.map(({ href, label, external }) => (
          <li key={href}>
            <Link
              href={href}
              // `noreferrer` alongside `noopener` because the destination is
              // off-site and has no reason to be told where the click came from.
              {...(external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="group -mx-2 inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {label}
              {external && (
                <ArrowUpRightIcon
                  aria-hidden
                  className="size-3 opacity-0 transition-opacity group-hover:opacity-70 group-focus-visible:opacity-70"
                />
              )}
              {external && <span className="sr-only">(opens in a new tab)</span>}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-border bg-card/40">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-64 w-216 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div className="space-y-4">
            <Link
              href="/"
              aria-label="Planwise home"
              className="inline-flex rounded-lg focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <Logo markClassName="size-7" />
            </Link>

            <p className="max-w-sm text-sm leading-relaxed text-pretty text-muted-foreground">
              Monthly targets, real spend, and the variance between them — with
              periods you can close for good.
            </p>

            <p className="inline-flex items-center gap-2 rounded-xl bg-locked/8 px-3 py-1.5 text-xs text-locked ring-1 ring-locked/20">
              <LockIcon aria-hidden className="size-3.5" />
              Locked periods are enforced server-side
            </p>
          </div>

          {/* Two columns on the narrowest screens rather than one: fourteen
              stacked links is a footer nobody scrolls past. */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-3 lg:gap-6">
            <FooterColumn title="Product" links={product} />
            <FooterColumn title="Workspace" links={workspace} />
            <FooterColumn title="Project" links={project} />
          </div>
        </div>

        <Separator className="my-10" />

        <div className="flex flex-col-reverse items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-pretty text-muted-foreground">
            &copy; {new Date().getFullYear()} Planwise. Built as a plan-vs-actual
            tracking exercise.
          </p>

          <a
            href={REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-border/60 px-3 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <GithubMark />
            View the source
            <span className="sr-only">on GitHub (opens in a new tab)</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
