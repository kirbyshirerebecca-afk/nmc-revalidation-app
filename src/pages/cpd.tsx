import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FileBadge, Plus, Trash2, Clock } from "lucide-react";

interface CpdLog {
  id: number;
  date: string;
  topic: string;
  method: string;
  hours: string;
  evidenceUrl?: string;
}

async function fetchCpd(): Promise<CpdLog[]> {
  const res = await fetch("/api/cpd", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch CPD logs");
  return res.json();
}

const emptyForm = { date: "", topic: "", method: "participatory" as "participatory" | "online", hours: "", evidenceUrl: "" };

export default function CpdLog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: logs = [], isLoading } = useQuery({ queryKey: ["cpd"], queryFn: fetchCpd });

  const totalHours = logs.reduce((sum, l) => sum + parseFloat(l.hours), 0);
  const participatory = logs.filter(l => l.method === "participatory").reduce((sum, l) => sum + parseFloat(l.hours), 0);
  const online = logs.filter(l => l.method === "online").reduce((sum, l) => sum + parseFloat(l.hours), 0);

  const addMutation = useMutation({
    mutationFn: async (data: typeof emptyForm) => {
      const res = await fetch("/api/cpd", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cpd"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setOpen(false);
      setForm(emptyForm);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/cpd/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cpd"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addMutation.mutate(form);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">CPD Log</h1>
          <p className="text-muted-foreground mt-1">
            Log your continuing professional development activities (35 hours required).
          </p>
        </div>
        <Button className="gap-2" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4" />
          Add CPD Entry
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-primary">{totalHours.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground mt-1">Total hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-primary">{participatory.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground mt-1">Participatory</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-primary">{online.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground mt-1">Online / self-directed</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress bar */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">Progress to 35-hour requirement</span>
            <span className="text-muted-foreground">{totalHours.toFixed(1)} / 35 hrs</span>
          </div>
          <div className="h-3 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${Math.min((totalHours / 35) * 100, 100)}%` }}
            />
          </div>
          {totalHours >= 35 && (
            <p className="text-xs text-green-600 font-medium mt-2">✓ Requirement met!</p>
          )}
        </CardContent>
      </Card>

      {/* Log entries */}
      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : logs.length === 0 ? (
        <Card className="border-dashed bg-secondary/30">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <FileBadge className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">No CPD entries yet</h3>
            <p className="text-muted-foreground text-sm max-w-sm mb-4">
              Keep track of courses, reading, and learning events that contribute to your professional development.
            </p>
            <Button variant="outline" onClick={() => setOpen(true)}>Create your first entry</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <Card key={log.id}>
              <CardContent className="py-3 px-4 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-foreground truncate">{log.topic}</p>
                    <Badge variant={log.method === "participatory" ? "default" : "secondary"} className="text-xs shrink-0">
                      {log.method === "participatory" ? "Participatory" : "Online"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span>{new Date(log.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{log.hours} hrs</span>
                  </div>
                  {log.evidenceUrl && (
                    <a href={log.evidenceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline mt-1 block truncate">
                      Evidence link
                    </a>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => deleteMutation.mutate(log.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add CPD Entry</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="topic">Topic / Activity</Label>
              <Input id="topic" placeholder="e.g. Infection control update" required value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="method">Method</Label>
              <select
                id="method"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                value={form.method}
                onChange={e => setForm(f => ({ ...f, method: e.target.value as "participatory" | "online" }))}
              >
                <option value="participatory">Participatory (e.g. training, workshop)</option>
                <option value="online">Online / self-directed (e.g. reading, e-learning)</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="hours">Hours</Label>
              <Input id="hours" type="number" step="0.5" min="0.5" placeholder="e.g. 2" required value={form.hours} onChange={e => setForm(f => ({ ...f, hours: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="evidence">Evidence URL <span className="text-muted-foreground">(optional)</span></Label>
              <Input id="evidence" type="url" placeholder="https://..." value={form.evidenceUrl} onChange={e => setForm(f => ({ ...f, evidenceUrl: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={addMutation.isPending}>
                {addMutation.isPending ? "Saving…" : "Save Entry"}
              </Button>
            </DialogFooter>
            {addMutation.isError && <p className="text-sm text-destructive">Failed to save. Please try again.</p>}
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
