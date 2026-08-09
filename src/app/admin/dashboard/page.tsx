import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

interface AdminStats {
  totalReviews: number;
  totalComments: number;
  approvalRate: number | null;
  feedbackCount: number;
  totalClients: number;
  totalConnectedRepos: number;
  topRules: { ruleId: string | null; count: number }[];
}

interface AdminReview {
  id: string;
  repo: string;
  owner: string;
  prNum: number;
  commentCount: number;
  createdAt: string;
}

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const h = { Cookie: cookieStore.toString() };

  const [stats, reviews]: [AdminStats, AdminReview[]] = await Promise.all([
    fetch(`${BASE}/api/admin/stats`, { cache: "no-store", headers: h }).then((r) => r.json()),
    fetch(`${BASE}/api/admin/reviews`, { cache: "no-store", headers: h }).then((r) => r.json()),
  ]);

  const metrics = [
    { label: "Total Reviews",    value: stats.totalReviews,                                          icon: "📋", grad: "from-indigo-500/10 to-indigo-500/5 border-indigo-800/50",  text: "text-indigo-400"  },
    { label: "Total Comments",   value: stats.totalComments,                                         icon: "💬", grad: "from-violet-500/10 to-violet-500/5 border-violet-800/50",  text: "text-violet-400"  },
    { label: "Approval Rate",    value: stats.approvalRate != null ? `${stats.approvalRate}%` : "—", icon: "✅", grad: "from-emerald-500/10 to-emerald-500/5 border-emerald-800/50", text: "text-emerald-400" },
    { label: "Feedback Entries", value: stats.feedbackCount,                                         icon: "🧠", grad: "from-amber-500/10 to-amber-500/5 border-amber-800/50",    text: "text-amber-400"   },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        <div>
          <h1 className="text-3xl font-bold text-gray-100">System Overview</h1>
          <p className="text-sm text-gray-500 mt-1">All users · all repositories · all reviews</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map(({ label, value, icon, grad, text }) => (
            <div key={label} className={`rounded-xl border bg-linear-to-b ${grad} p-5 space-y-3`}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
                <span className="text-lg">{icon}</span>
              </div>
              <p className={`text-3xl font-bold ${text}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="font-semibold text-gray-200">All Recent Reviews</h2>
            <span className="text-xs text-gray-600">{reviews.length} shown</span>
          </div>
          {reviews.length === 0 ? (
            <div className="px-6 py-12 text-center"><p className="text-gray-600 text-sm">No reviews yet.</p></div>
          ) : (
            <div className="divide-y divide-gray-800/50">
              {reviews.map((r) => (
                <div key={r.id} className="px-6 py-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-indigo-400 bg-indigo-950/50 border border-indigo-900/50 rounded px-2 py-0.5">#{r.prNum}</span>
                      <span className="text-sm text-gray-300 truncate">{r.repo}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {r.commentCount} comment{r.commentCount !== 1 ? "s" : ""} · {new Date(r.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {stats.topRules.length > 0 && (
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800">
              <h2 className="font-semibold text-gray-200">Top Rejected Rules (system-wide)</h2>
            </div>
            <div className="px-6 py-4 space-y-3">
              {stats.topRules.map(({ ruleId, count }, i) => (
                <div key={ruleId} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 w-5">{i + 1}.</span>
                  <span className="text-xs font-mono text-gray-300 flex-1">{ruleId ?? "unknown"}</span>
                  <span className="text-xs text-gray-500">{count} rejection{count !== 1 ? "s" : ""}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
