"use client";

import Image from "next/image";
import { useQuery, useQueryClient } from "@tanstack/react-query";


import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: "CLIENT" | "ADMIN";
  createdAt: string;
  clientProfile: {
    githubLogin: string;
    _count: { feedback: number };
    repos: { id: string; fullName: string; active: boolean; createdAt: string }[];
  } | null;
}

const USERS_KEY = ["admin", "users"];

const fetcher = <T,>(url: string): Promise<T> =>
  fetch(url).then((r) => (r.ok ? r.json() : []));

export default function AdminUsersPage() {
  const qc = useQueryClient();

  const { data: users = [], isLoading } = useQuery<AdminUser[]>({
    queryKey: USERS_KEY,
    queryFn: () => fetcher("/api/admin/users"),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
    placeholderData: (prev) => prev,
  });

  async function disconnectRepo(repoId: string) {
    await fetch(`/api/client/repos/${repoId}`, { method: "DELETE" });
    qc.invalidateQueries({ queryKey: USERS_KEY });
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6 py-12 space-y-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Users</h1>
            <p className="text-muted-foreground mt-2">
              {isLoading ? "Loading…" : `${users.length} client${users.length !== 1 ? "s" : ""} registered`}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => qc.invalidateQueries({ queryKey: USERS_KEY })}
          >
            Refresh
          </Button>
        </div>

        {isLoading && users.length === 0 && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        )}

        <div className="space-y-4">
          {users.map((u) => {
            const feedbackCount = u.clientProfile?._count.feedback ?? 0;
            const repoCount = u.clientProfile?.repos.length ?? 0;

            return (
              <Card key={u.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-4">
                    {u.image ? (
                      <Image
                        src={u.image}
                        alt={u.name ?? u.email}
                        width={40}
                        height={40}
                        className="rounded-full ring-2 ring-border shrink-0"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold shrink-0">
                        {(u.name ?? u.email).slice(0, 1).toUpperCase()}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base">
                          {u.name ?? u.email}
                        </CardTitle>
                        {u.clientProfile && (
                          <span className="font-mono text-xs text-muted-foreground">
                            @{u.clientProfile.githubLogin}
                          </span>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {u.role}
                        </Badge>
                      </div>
                      <CardDescription className="mt-0.5">
                        {u.email} · Joined {new Date(u.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 text-right">
                      <div>
                        <p className="text-xs text-muted-foreground">Repos</p>
                        <p className="text-sm font-semibold">{repoCount}</p>
                      </div>
                      <Separator orientation="vertical" className="h-8" />
                      <div>
                        <p className="text-xs text-muted-foreground">Feedback</p>
                        <p className="text-sm font-semibold">{feedbackCount}</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                {repoCount > 0 && (
                  <>
                    <Separator />
                    <CardContent className="p-0">
                      <div className="divide-y divide-border">
                        {u.clientProfile!.repos.map((r) => (
                          <div key={r.id} className="flex items-center gap-3 px-6 py-2.5">
                            <span className="text-xs font-mono text-muted-foreground flex-1 truncate">
                              {r.fullName}
                            </span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {new Date(r.createdAt).toLocaleDateString()}
                            </span>
                            <Badge
                              className={r.active
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10 text-xs"
                                : "text-xs"}
                              variant={r.active ? "outline" : "secondary"}
                            >
                              {r.active ? "Active" : "Inactive"}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => disconnectRepo(r.id)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs h-7 shrink-0"
                            >
                              Disconnect
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </>
                )}
              </Card>
            );
          })}

          {!isLoading && users.length === 0 && (
            <Card>
              <CardContent className="py-16 text-center">
                <p className="text-muted-foreground">No clients registered yet.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
