"use client";

import Link from "next/link";
import {
  ActivityIcon,
  ArrowRightIcon,
  FolderIcon,
  LockIcon,
  MailCheckIcon,
  ReceiptIcon,
  ShieldCheckIcon,
  TargetIcon,
  UsersIcon,
} from "lucide-react";

import { PageHeader, Panel } from "@/components/common/page-header";
import { Rise, Stagger } from "@/components/common/motion";
import { CountUpValue, StatTile } from "@/components/common/stat-tile";
import { ErrorState, LoadingRows } from "@/components/common/states";
import { SignupChart } from "@/components/admin/signup-chart";
import { FailureList, QueueTotals } from "@/components/admin/queue-panel";
import { Button } from "@/components/ui/button";
import { useAdminOverview } from "@/lib/hooks";

/**
 * The platform at a glance.
 *
 * Ordered by how often it is the reason someone opened the page: who is here,
 * how that has been trending, what they have built, and whether the queue is
 * healthy. The queue sits last because it is usually fine — and it is the one
 * section that is impossible to miss when it is not.
 */

const integer = (value: number) => Math.round(value).toLocaleString();

export default function AdminDashboardPage() {
  const overview = useAdminOverview();
  const data = overview.data;

  return (
    <Stagger className="space-y-8">
      <Rise>
        <PageHeader
          title="Console"
          description="Who is on the platform, what they have built, and whether the report queue is keeping up."
          actions={
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              nativeButton={false}
              render={<Link href="/admin/users" />}
            >
              <UsersIcon aria-hidden />
              Manage users
              <ArrowRightIcon aria-hidden />
            </Button>
          }
        />
      </Rise>

      {overview.isError && (
        <Rise>
          <ErrorState error={overview.error} onRetry={() => overview.refetch()} />
        </Rise>
      )}

      {overview.isPending && !overview.isError && (
        <Rise>
          <LoadingRows rows={5} />
        </Rise>
      )}

      {data && (
        <>
          <Rise>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatTile
                label="Users"
                icon={<UsersIcon aria-hidden className="size-4" />}
                value={<CountUpValue to={data.users.total} format={integer} />}
                hint={
                  data.users.newThisMonth > 0
                    ? `${data.users.newThisMonth} joined this month`
                    : "None joined this month"
                }
              />

              <StatTile
                label="Verified"
                accent="favorable"
                icon={<MailCheckIcon aria-hidden className="size-4" />}
                value={<CountUpValue to={data.users.verified} format={integer} />}
                hint={
                  data.users.unverified > 0
                    ? `${data.users.unverified} still unconfirmed`
                    : "Every account is confirmed"
                }
              />

              <StatTile
                label="Active"
                accent="info"
                icon={<ActivityIcon aria-hidden className="size-4" />}
                value={<CountUpValue to={data.activeUsers} format={integer} />}
                hint="Logged an entry in the last 30 days"
              />

              <StatTile
                label="Admins"
                accent="locked"
                icon={<ShieldCheckIcon aria-hidden className="size-4" />}
                value={<CountUpValue to={data.users.admins} format={integer} />}
                hint={
                  data.users.admins === 1
                    ? "One account can reach this console"
                    : `${data.users.admins} accounts can reach this console`
                }
              />
            </div>
          </Rise>

          <div className="grid gap-6 lg:grid-cols-5">
            <Rise className="lg:col-span-3">
              <Panel
                title="Signups"
                description="New accounts per month, over the last year"
              >
                <SignupChart points={data.signups} />
              </Panel>
            </Rise>

            <Rise className="lg:col-span-2">
              <Panel
                title="Across every workspace"
                description="What the platform holds in total"
              >
                <ul className="grid grid-cols-2 gap-3">
                  <WorkspaceTile
                    label="Categories"
                    value={data.workspace.categories}
                    icon={<FolderIcon aria-hidden className="size-4" />}
                  />
                  <WorkspaceTile
                    label="Targets"
                    value={data.workspace.plans}
                    icon={<TargetIcon aria-hidden className="size-4" />}
                  />
                  <WorkspaceTile
                    label="Entries"
                    value={data.workspace.actuals}
                    icon={<ReceiptIcon aria-hidden className="size-4" />}
                  />
                  <WorkspaceTile
                    label="Locked months"
                    value={data.workspace.lockedMonths}
                    icon={<LockIcon aria-hidden className="size-4" />}
                  />
                </ul>

                <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                  Counts, never amounts. The console can say how much has been
                  logged, never what any of it was for — a user&rsquo;s figures
                  stay theirs.
                </p>
              </Panel>
            </Rise>
          </div>

          <Rise>
            <Panel
              title="Report queue"
              description="Runs by status, and anything that failed"
            >
              <div className="space-y-5">
                <QueueTotals queue={data.queue} />

                <div className="space-y-2">
                  <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Recent failures
                  </h3>
                  <FailureList failures={data.failures} />
                </div>
              </div>
            </Panel>
          </Rise>
        </>
      )}
    </Stagger>
  );
}

/** One platform total. Smaller than a `StatTile` — these are context, not news. */
function WorkspaceTile({
  label,
  value,
  icon,
}: Readonly<{ label: string; value: number; icon: React.ReactNode }>) {
  return (
    <li className="rounded-xl border border-border/60 bg-card/40 p-3">
      <span className="flex size-7 items-center justify-center rounded-lg bg-primary/8 text-primary ring-1 ring-primary/15">
        {icon}
      </span>
      <p className="mt-2 text-xl font-semibold tracking-tight tabular">
        {value.toLocaleString()}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </li>
  );
}
