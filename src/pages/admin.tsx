import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Loader2, Users, Crown, UserCheck } from "lucide-react";

type User = {
  id: number;
  email: string;
  tier: "free" | "premium";
  renewalDate: string | null;
  createdAt: string;
};

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function fetchUsers(): Promise<User[]> {
  const res = await fetch(`${BASE}/api/users`);
  if (!res.ok) throw new Error("Failed to load users");
  return res.json();
}

async function patchTier(id: number, tier: "free" | "premium") {
  const res = await fetch(`${BASE}/api/users/${id}/tier`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tier }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Update failed");
  }
  return res.json();
}

export default function Admin() {
  const qc = useQueryClient();
  const [toggling, setToggling] = useState<number | null>(null);

  const { data: users = [], isLoading, error } = useQuery<User[]>({
    queryKey: ["admin-users"],
    queryFn: fetchUsers,
  });

  const mutation = useMutation({
    mutationFn: ({ id, tier }: { id: number; tier: "free" | "premium" }) =>
      patchTier(id, tier),
    onMutate: ({ id }) => setToggling(id),
    onSettled: () => {
      setToggling(null);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const premium = users.filter((u) => u.tier === "premium").length;
  const free = users.filter((u) => u.tier === "free").length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Admin Panel</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Manage user tiers — keep this page private before adding auth.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Premium</CardTitle>
            <Crown className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{premium}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Free</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{free}</div>
          </CardContent>
        </Card>
      </div>

      {/* Users table */}
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading users…
            </div>
          )}
          {error && (
            <div className="px-6 py-4 text-sm text-destructive">
              Failed to load users. Is the API server running?
            </div>
          )}
          {!isLoading && !error && users.length === 0 && (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              No users yet.
            </div>
          )}
          {users.length > 0 && (
            <div className="divide-y divide-border">
              {/* Header row */}
              <div className="grid grid-cols-[1fr_120px_110px_130px] gap-4 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary/40">
                <span>Email</span>
                <span>Renewal Date</span>
                <span>Tier</span>
                <span>Action</span>
              </div>

              {users.map((user) => (
                <div
                  key={user.id}
                  className="grid grid-cols-[1fr_120px_110px_130px] gap-4 items-center px-6 py-3.5 hover:bg-secondary/20 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground truncate">{user.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Joined {new Date(user.createdAt).toLocaleDateString("en-GB")}
                    </p>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {user.renewalDate
                      ? new Date(user.renewalDate).toLocaleDateString("en-GB")
                      : "—"}
                  </p>

                  <div>
                    {user.tier === "premium" ? (
                      <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1">
                        <Crown className="h-3 w-3" /> Premium
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Free</Badge>
                    )}
                  </div>

                  <div>
                    {user.tier === "free" ? (
                      <Button
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
                        disabled={toggling === user.id}
                        onClick={() => mutation.mutate({ id: user.id, tier: "premium" })}
                      >
                        {toggling === user.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Crown className="h-3 w-3" />
                        )}
                        Make Premium
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 text-xs text-muted-foreground"
                        disabled={toggling === user.id}
                        onClick={() => mutation.mutate({ id: user.id, tier: "free" })}
                      >
                        {toggling === user.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : null}
                        Downgrade
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        ⚠️ This page has no authentication guard yet. Add one before deploying to production.
      </p>
    </div>
  );
}
