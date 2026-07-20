import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Clock,
  FileBadge,
  CalendarDays,
  Download,
  Loader2,
  CheckCircle,
  Crown,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";

// NMC Pro yearly price ID (live mode)
const NMC_PRO_PRICE_ID = "price_1Tuskt1WLSvXxslNrsHXwYBF";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type ExportState = "idle" | "loading" | "success" | "error";
type CheckoutState = "idle" | "loading";

type UserProfile = {
  id: string;
  email: string | null;
  tier: "free" | "premium";
  renewalDate: string | null;
};

type Stats = {
  cpdHours: number;
  practiceHours: number;
  reflectionCount: number;
};

function useCurrentUserProfile() {
  return useQuery<UserProfile | null>({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/users/me`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    throwOnError: false,
  });
}

function useStats() {
  return useQuery<Stats>({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/stats`, { credentials: "include" });
      if (!res.ok) return { cpdHours: 0, practiceHours: 0, reflectionCount: 0 };
      return res.json();
    },
    retry: false,
    throwOnError: false,
  });
}

function UpgradeBanner() {
  const [checkoutState, setCheckoutState] = useState<CheckoutState>("idle");

  async function handleUpgrade() {
    setCheckoutState("loading");
    try {
      const res = await fetch(`${BASE}/api/stripe/checkout`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: NMC_PRO_PRICE_ID }),
      });
      if (!res.ok) throw new Error("Could not start checkout");
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      setCheckoutState("idle");
    }
  }

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary to-primary/80 px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
      <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/10 pointer-events-none" />
      <div className="absolute -bottom-8 right-16 h-16 w-16 rounded-full bg-white/10 pointer-events-none" />

      <div className="flex items-start gap-3 relative">
        <div className="mt-0.5 shrink-0 rounded-full bg-white/20 p-2">
          <Crown className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-white text-base leading-snug">
            Upgrade to Premium to Unlock Unlimited AI Reflections &amp; PDF Exporting
          </p>
          <p className="text-white/75 text-sm mt-0.5">
            First month free · Then £39.99/year · Cancel any time
          </p>
        </div>
      </div>

      <Button
        size="lg"
        className="shrink-0 bg-white text-primary hover:bg-white/90 font-semibold gap-2 shadow-sm"
        onClick={handleUpgrade}
        disabled={checkoutState === "loading"}
      >
        {checkoutState === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {checkoutState === "loading" ? "Redirecting…" : "Upgrade Now"}
      </Button>
    </div>
  );
}

export default function Dashboard() {
  const [exportState, setExportState] = useState<ExportState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const { user } = useAuth();
  const { data: profile } = useCurrentUserProfile();
  const { data: stats } = useStats();

  const isFree = !profile || profile.tier === "free";
  const firstName = user?.firstName || user?.email?.split("@")[0] || "there";

  const cpdHours = stats?.cpdHours ?? 0;
  const practiceHours = stats?.practiceHours ?? 0;
  const reflectionCount = stats?.reflectionCount ?? 0;

  const CPD_TARGET = 35;
  const PRACTICE_TARGET = 450;
  const REFLECTION_TARGET = 5;

  const cpdRemaining = Math.max(0, CPD_TARGET - cpdHours);
  const practiceRemaining = Math.max(0, PRACTICE_TARGET - practiceHours);
  const reflectionsRemaining = Math.max(0, REFLECTION_TARGET - reflectionCount);

  // Days until renewal
  const renewalDays = profile?.renewalDate
    ? Math.max(0, Math.ceil((new Date(profile.renewalDate).getTime() - Date.now()) / 86400000))
    : null;

  async function handleExport() {
    setExportState("loading");
    setErrorMsg("");
    try {
      const res = await fetch(`${BASE}/api/export/portfolio`, {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(body.error ?? "Export failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `NMC_Revalidation_Portfolio_${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setExportState("success");
      setTimeout(() => setExportState("idle"), 4000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Export failed");
      setExportState("error");
      setTimeout(() => setExportState("idle"), 5000);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Hello, {firstName} 👋
        </h1>
        <p className="text-muted-foreground mt-2">
          Your NMC revalidation overview and progress.
        </p>
      </div>

      {/* Upgrade banner — free users only */}
      {isFree && <UpgradeBanner />}

      {/* Export banner — premium users only */}
      {!isFree && (
        <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-base font-semibold text-foreground">Ready to submit?</span>
            <span className="text-sm text-muted-foreground max-w-lg">
              Compile your complete CPD log, practice hours, and reflective accounts into a single
              formatted PDF — ready to hand to your confirmer.
            </span>
          </div>
          <Button
            size="lg"
            className="shrink-0 gap-2 px-6 shadow-md"
            onClick={handleExport}
            disabled={exportState === "loading"}
          >
            {exportState === "loading" && <Loader2 className="h-5 w-5 animate-spin" />}
            {exportState === "success" && <CheckCircle className="h-5 w-5" />}
            {(exportState === "idle" || exportState === "error") && (
              <Download className="h-5 w-5" />
            )}
            {exportState === "loading"
              ? "Compiling portfolio…"
              : exportState === "success"
                ? "Downloaded"
                : "Export Complete NMC Portfolio"}
          </Button>
        </div>
      )}

      {exportState === "error" && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {errorMsg || "Export failed — please try again."}
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Practice Hours</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {practiceHours.toFixed(0)} / {PRACTICE_TARGET}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {practiceRemaining === 0
                ? "Required hours completed ✓"
                : `${practiceRemaining} hours remaining`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPD Hours</CardTitle>
            <FileBadge className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cpdHours.toFixed(1)} / {CPD_TARGET}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {cpdRemaining === 0
                ? "CPD target met ✓"
                : `${cpdRemaining.toFixed(1)} hours remaining`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reflections</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reflectionCount} / {REFLECTION_TARGET}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {reflectionsRemaining === 0
                ? "All reflections complete ✓"
                : `${reflectionsRemaining} more needed`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Renewal Date</CardTitle>
            <CalendarDays className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {renewalDays !== null ? `${renewalDays} days` : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {profile?.renewalDate
                ? new Date(profile.renewalDate).toLocaleDateString("en-GB")
                : "Not set"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="col-span-1 border-dashed bg-secondary/30">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground flex flex-col items-center justify-center py-10">
            <FileBadge className="w-10 h-10 text-muted mb-4" />
            <p>Your recent CPD and reflection entries will appear here.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
