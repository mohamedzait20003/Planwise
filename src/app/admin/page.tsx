import Image from "next/image";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { DisconnectButton } from "@/components/admin/disconnect-button";

export const dynamic = "force-dynamic";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

interface AdminUser {
  id: string;
  githubLogin: string;
  name: string | null;
  image: string | null;
  role: "USER" | "ADMIN";
  createdAt: string;
  _count: { reviews: number };
  repos: { id: string; fullName: string; active: boolean; createdAt: string }[];
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") redirect("/dashboard");

  const res = await fetch(`${BASE}/api/admin/users`, { cache: "no-store" });
  const users: AdminUser[] = res.ok ? await res.json() : [];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">

        <div>
          <h1 className="text-3xl font-bold text-gray-100">Admin</h1>
          <p className="text-sm text-gray-500 mt-1">
            {users.length} user{users.length !== 1 ? "s" : ""} registered
          </p>
        </div>

        <div className="space-y-4">
          {users.map((u) => (
            <div key={u.id} className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
              <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-800/50">
                {u.image && (
                  <Image
                    src={u.image}
                    alt={u.name ?? u.githubLogin}
                    width={36}
                    height={36}
                    className="rounded-full ring-1 ring-gray-700"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-200">{u.name ?? u.githubLogin}</span>
                    <span className="font-mono text-xs text-gray-500">@{u.githubLogin}</span>
                    {u.role === "ADMIN" && (
                      <span className="text-xs bg-indigo-900/50 text-indigo-300 border border-indigo-800/50 rounded-full px-2 py-0.5">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Joined {new Date(u.createdAt).toLocaleDateString()} · {u._count.reviews} review{u._count.reviews !== 1 ? "s" : ""}
                  </p>
                </div>
                <span className="text-xs text-gray-600">
                  {u.repos.length} repo{u.repos.length !== 1 ? "s" : ""}
                </span>
              </div>

              {u.repos.length > 0 && (
                <div className="divide-y divide-gray-800/30">
                  {u.repos.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 px-6 py-2.5">
                      <span className="text-xs font-mono text-gray-400 flex-1">{r.fullName}</span>
                      <span className={`text-xs rounded-full px-2 py-0.5 border ${r.active
                        ? "text-emerald-400 bg-emerald-900/20 border-emerald-800/30"
                        : "text-gray-600 bg-gray-800/30 border-gray-700/30"}`}
                      >
                        {r.active ? "Active" : "Inactive"}
                      </span>
                      <DisconnectButton repoId={r.id} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
