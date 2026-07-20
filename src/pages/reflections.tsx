import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEnhanceReflection } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Copy, Sparkles, CheckCircle2, AlertCircle, Trash2, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface Reflection {
  id: number;
  title: string;
  draftNotes?: string;
  aiGeneratedReflection?: string;
  createdAt: string;
}

async function fetchReflections(): Promise<Reflection[]> {
  const res = await fetch("/api/reflections", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch reflections");
  return res.json();
}

export default function Reflections() {
  const [notes, setNotes] = useState("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const [limitReached, setLimitReached] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const { data: reflections = [], isLoading } = useQuery({
    queryKey: ["reflections"],
    queryFn: fetchReflections,
  });

  const enhanceReflection = useEnhanceReflection();

  const handleFormat = async () => {
    if (!notes.trim()) return;
    setLimitReached(false);
    try {
      await enhanceReflection.mutateAsync({ data: { notes } });
    } catch (err: any) {
      if (err?.status === 403) {
        setLimitReached(true);
      }
    }
  };

  const saveMutation = useMutation({
    mutationFn: async ({ title }: { title: string }) => {
      const res = await fetch("/api/reflections", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          draftNotes: notes,
          aiGeneratedReflection: enhanceReflection.data
            ? JSON.stringify(enhanceReflection.data)
            : undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reflections"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setSaveDialogOpen(false);
      setTitleInput("");
      toast({ title: "Saved to portfolio", description: "Your reflection has been saved." });
    },
    onError: () => {
      toast({ title: "Failed to save", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/reflections/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reflections"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });

  const copyToClipboard = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied to clipboard", description: `${section} has been copied.` });
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const isBlocked = limitReached || (enhanceReflection.isError && !limitReached);

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Reflections</h1>
        <p className="text-muted-foreground mt-2">
          Manage your 5 required reflective accounts.
        </p>
      </div>

      {/* AI Enhancer */}
      <Card className="border-primary/20 shadow-sm overflow-hidden">
        <div className="bg-primary/5 px-6 py-4 border-b border-primary/10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">AI Reflection Enhancer</h2>
            <p className="text-sm text-muted-foreground">
              Paste your notes from a shift or feedback below, and we'll format them into a complete NMC reflection.
            </p>
          </div>
        </div>

        <CardContent className="p-6 space-y-4">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={"e.g. - received feedback from ward manager about handover technique\n- felt rushed during morning handover\n- missed some key patient info\n- need to use SBAR framework more consistently"}
            className="min-h-[160px] resize-y text-base"
            disabled={enhanceReflection.isPending}
          />

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Your notes are processed securely and not stored for training.
            </p>
            <Button
              onClick={handleFormat}
              disabled={!notes.trim() || enhanceReflection.isPending}
              className="px-6"
            >
              {enhanceReflection.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Formatting your reflection...</>
              ) : (
                "Format for NMC"
              )}
            </Button>
          </div>

          {/* Limit reached paywall */}
          {limitReached && (
            <div className="mt-4 p-5 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-amber-900">Free reflection used</h4>
                <p className="text-sm text-amber-800 mt-1">
                  You've used your 1 free AI reflection. Upgrade to Premium for unlimited reflections, plus PDF portfolio export.
                </p>
                <Button
                  className="mt-3"
                  size="sm"
                  onClick={() => navigate("/pricing")}
                >
                  Upgrade to Premium — £39.99/year
                </Button>
              </div>
            </div>
          )}

          {/* Generic error */}
          {enhanceReflection.isError && !limitReached && (
            <div className="mt-4 p-4 rounded-md bg-destructive/10 border border-destructive/20 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-destructive">Formatting failed</h4>
                <p className="text-sm text-destructive/80 mt-1">
                  There was an error processing your notes. Please try again or check your connection.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {enhanceReflection.isSuccess && enhanceReflection.data && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-2 pb-2 border-b">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-semibold">Structured NMC Reflection</h3>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <OutputCard
              title="Part 1: Nature of CPD / Feedback"
              content={enhanceReflection.data.natureOfCpd}
              onCopy={() => copyToClipboard(enhanceReflection.data.natureOfCpd, "Nature of CPD")}
            />
            <OutputCard
              title="Part 2: What I Learned"
              content={enhanceReflection.data.whatLearned}
              onCopy={() => copyToClipboard(enhanceReflection.data.whatLearned, "What I Learned")}
            />
            <OutputCard
              title="Part 3: Changes to My Practice"
              content={enhanceReflection.data.practiceChanges}
              onCopy={() => copyToClipboard(enhanceReflection.data.practiceChanges, "Changes to Practice")}
            />
            <OutputCard
              title="Part 4: Relation to the NMC Code"
              content={enhanceReflection.data.nmcCodeRelation}
              onCopy={() => copyToClipboard(enhanceReflection.data.nmcCodeRelation, "Relation to NMC Code")}
            />
          </div>

          <div className="flex justify-end pt-4 gap-3">
            <Button variant="outline" onClick={() => { setNotes(""); enhanceReflection.reset(); }}>
              Clear Notes
            </Button>
            <Button onClick={() => setSaveDialogOpen(true)}>
              Save to Portfolio
            </Button>
          </div>
        </div>
      )}

      {/* Saved reflections list */}
      <div className="pt-4">
        <h3 className="text-lg font-semibold mb-4">Saved Reflections ({reflections.length} / 5)</h3>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : reflections.length === 0 ? (
          <Card className="border-dashed bg-secondary/30">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">No reflections saved</h3>
              <p className="text-muted-foreground text-sm max-w-sm">
                Use the AI Enhancer above to create and save your first reflective account.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {reflections.map((r) => (
              <Card key={r.id}>
                <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{r.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Saved {new Date(r.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => deleteMutation.mutate(r.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Save dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save to Portfolio</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="ref-title">Give this reflection a title</Label>
            <Input
              id="ref-title"
              placeholder="e.g. Handover feedback — June 2026"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
            <Button
              disabled={!titleInput.trim() || saveMutation.isPending}
              onClick={() => saveMutation.mutate({ title: titleInput })}
            >
              {saveMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OutputCard({ title, content, onCopy }: { title: string; content: string; onCopy: () => void }) {
  return (
    <Card className="h-full flex flex-col hover:border-primary/30 transition-colors">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 bg-secondary/30 border-b">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <Button variant="ghost" size="icon" onClick={onCopy} className="h-8 w-8 text-muted-foreground hover:text-foreground">
          <Copy className="h-4 w-4" />
          <span className="sr-only">Copy {title}</span>
        </Button>
      </CardHeader>
      <CardContent className="pt-4 flex-1">
        <div className="prose prose-sm max-w-none text-foreground/90 leading-relaxed whitespace-pre-wrap">
          {content}
        </div>
      </CardContent>
    </Card>
  );
}
