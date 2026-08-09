"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Proposal {
  id: string;
  proposedSoul: string | null;
  proposedRules: string | null;
  reasoning: string;
  createdAt: string;
}

interface AgentViewProps {
  soul: string;
  rules: string;
  proposals: Proposal[];
  agentId: string;
}

type DiffLine = { type: "equal" | "added" | "removed"; text: string };

function lineDiff(before: string, after: string): DiffLine[] {
  const a = before.split("\n");
  const b = after.split("\n");
  const m = a.length;
  const n = b.length;

  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);

  const result: DiffLine[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      result.unshift({ type: "equal", text: a[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: "added", text: b[j - 1] });
      j--;
    } else {
      result.unshift({ type: "removed", text: a[i - 1] });
      i--;
    }
  }
  return result;
}

function DiffBlock({ lines }: { lines: DiffLine[] }) {
  return (
    <pre className="text-xs font-mono leading-5 overflow-auto">
      {lines.map((l, i) => {
        const cls =
          l.type === "added"
            ? "bg-emerald-950/60 text-emerald-300 block"
            : l.type === "removed"
            ? "bg-red-950/60 text-red-400 line-through block opacity-70"
            : "block text-muted-foreground";
        const prefix =
          l.type === "added" ? "+ " : l.type === "removed" ? "- " : "  ";
        return (
          <span key={i} className={cls}>
            {prefix}{l.text}
          </span>
        );
      })}
    </pre>
  );
}

function PlainBlock({ content }: { content: string }) {
  return (
    <pre className="text-xs font-mono leading-5 text-muted-foreground overflow-auto whitespace-pre-wrap">
      {content}
    </pre>
  );
}

function ContentPane({
  soul,
  rules,
  selected,
}: {
  soul: string;
  rules: string;
  selected: Proposal | null;
}) {
  const hasSoulChange  = !!selected?.proposedSoul;
  const hasRulesChange = !!selected?.proposedRules;
  const isDiff = !!selected;

  return (
    <div className="space-y-6 h-full">
      {isDiff && (
        <div className="rounded-lg border border-amber-800/40 bg-amber-950/20 px-4 py-2.5 text-xs text-amber-300 flex items-center gap-2">
          <span className="shrink-0">⚡</span>
          Showing proposed changes —{" "}
          <span className="text-emerald-400 font-mono">+ added</span>
          {" · "}
          <span className="text-red-400 font-mono line-through">- removed</span>
        </div>
      )}

      {/* RULES */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">RULES</h3>
          {isDiff && hasRulesChange && (
            <Badge className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/10">
              changed
            </Badge>
          )}
        </div>
        <div className="rounded-lg border border-border bg-muted/20 p-4 max-h-[340px] overflow-auto">
          {isDiff && hasRulesChange
            ? <DiffBlock lines={lineDiff(rules, selected!.proposedRules!)} />
            : <PlainBlock content={rules} />}
        </div>
      </section>

      {/* SOUL */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">SOUL</h3>
          {isDiff && hasSoulChange && (
            <Badge className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/10">
              changed
            </Badge>
          )}
        </div>
        <div className="rounded-lg border border-border bg-muted/20 p-4 max-h-[340px] overflow-auto">
          {isDiff && hasSoulChange
            ? <DiffBlock lines={lineDiff(soul, selected!.proposedSoul!)} />
            : <PlainBlock content={soul} />}
        </div>
      </section>
    </div>
  );
}

function ProposalsPane({
  proposals,
  agentId,
  selected,
  onSelect,
  onActioned,
}: {
  proposals: Proposal[];
  agentId: string;
  selected: Proposal | null;
  onSelect: (p: Proposal | null) => void;
  onActioned: (id: string) => void;
}) {
  const [acting, setActing] = useState<string | null>(null);
  const router = useRouter();

  async function act(proposalId: string, action: "approve" | "reject") {
    setActing(proposalId + action);
    await fetch(`/api/admin/agents/${agentId}/proposals/${proposalId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setActing(null);
    onActioned(proposalId);
    if (selected?.id === proposalId) onSelect(null);
    router.refresh();
  }

  if (proposals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center text-xl">✓</div>
        <p className="text-sm font-medium">No pending proposals</p>
        <p className="text-xs text-muted-foreground max-w-xs">
          Run <code className="bg-muted px-1 py-0.5 rounded">npm run cron</code> to have the meta-agent analyse rejection patterns.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {proposals.map((p) => {
        const isSelected = selected?.id === p.id;
        const changes = [p.proposedRules && "RULES", p.proposedSoul && "SOUL"].filter(Boolean).join(" + ");

        return (
          <div
            key={p.id}
            onClick={() => onSelect(isSelected ? null : p)}
            className={`rounded-lg border p-4 space-y-3 cursor-pointer transition-colors ${
              isSelected
                ? "border-primary/50 bg-primary/5"
                : "border-border bg-card hover:bg-muted/30"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs font-mono shrink-0">
                    {changes}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(p.createdAt).toLocaleDateString(undefined, {
                      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{p.reasoning}</p>
              </div>
            </div>

            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <Button
                size="sm"
                className="flex-1 h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
                disabled={acting !== null}
                onClick={() => act(p.id, "approve")}
              >
                {acting === p.id + "approve" ? "Applying…" : "✓ Approve"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                disabled={acting !== null}
                onClick={() => act(p.id, "reject")}
              >
                {acting === p.id + "reject" ? "Rejecting…" : "✗ Reject"}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Root component ────────────────────────────────────────────────────────────

export function AgentView({ soul, rules, proposals: initial, agentId }: AgentViewProps) {
  const [proposals, setProposals] = useState(initial);
  const [selected, setSelected]   = useState<Proposal | null>(null);

  function removeProposal(id: string) {
    setProposals((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="grid gap-6 items-start lg:grid-cols-5">
      <div className="lg:col-start-4 lg:col-span-2 lg:row-start-1 space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Proposed Changes
          </h2>
          {proposals.length > 0 && (
            <Badge className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/10">
              {proposals.length}
            </Badge>
          )}
        </div>
        {selected && (
          <p className="text-xs text-muted-foreground">
            Click again to deselect · diff shown on the left
          </p>
        )}
        <ProposalsPane
          proposals={proposals}
          agentId={agentId}
          selected={selected}
          onSelect={setSelected}
          onActioned={removeProposal}
        />
      </div>
      <div className="lg:col-start-1 lg:col-span-3 lg:row-start-1">
        <ContentPane soul={soul} rules={rules} selected={selected} />
      </div>
    </div>
  );
}
