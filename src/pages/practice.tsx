import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, Plus, Trash2, Building2 } from "lucide-react";

interface PracticeEntry {
  id: number;
  employer: string;
  role: string;
  setting: string;
  hours: string;
  startDate?: string;
  endDate?: string;
}

async function fetchPractice(): Promise<PracticeEntry[]> {
  const res = await fetch("/api/practice", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch practice hours");
  return res.json();
}

const emptyForm = { employer: "", role: "", setting: "", hours: "", startDate: "", endDate: "" };

export default function PracticeHours() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: entries = [], isLoading } = useQuery({ queryKey: ["practice"], queryFn: fetchPractice });

  const totalHours = entries.reduce((sum, e) => sum + parseFloat(e.hours), 0);

  const addMutation = useMutation({
    mutationFn: async (data: typeof emptyForm) => {
      const res = await fetch("/api/practice", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practice"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setOpen(false);
      setForm(emptyForm);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/practice/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practice"] });
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Practice Hours</h1>
          <p className="text-muted-foreground mt-1">
            Log your professional practice hours (450 hours required over 3 years).
          </p>
        </div>
        <Button className="gap-2" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4" />
          Log Hours
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-primary">{totalHours.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground mt-1">Total hours logged</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-primary">{Math.max(0, 450 - totalHours).toFixed(0)}</p>
            <p className="text-xs text-muted-foreground mt-1">Hours remaining</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress bar */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">Progress to 450-hour requirement</span>
            <span className="text-muted-foreground">{totalHours.toFixed(1)} / 450 hrs</span>
          </div>
          <div className="h-3 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${Math.min((totalHours / 450) * 100, 100)}%` }}
            />
          </div>
          {totalHours >= 450 && (
            <p className="text-xs text-green-600 font-medium mt-2">✓ Requirement met!</p>
          )}
        </CardContent>
      </Card>

      {/* Entries */}
      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : entries.length === 0 ? (
        <Card className="border-dashed bg-secondary/30">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Clock className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">No practice hours logged</h3>
            <p className="text-muted-foreground text-sm max-w-sm mb-4">
              Record the hours you've worked in your capacity as a registered professional.
            </p>
            <Button variant="outline" onClick={() => setOpen(true)}>Log practice hours</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="py-3 px-4 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                    <p className="font-medium text-foreground truncate">{entry.employer}</p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{entry.role} · {entry.setting}</p>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{entry.hours} hrs</span>
                    {entry.startDate && entry.endDate && (
                      <span>{new Date(entry.startDate).toLocaleDateString("en-GB", { month: "short", year: "numeric" })} – {new Date(entry.endDate).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}</span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => deleteMutation.mutate(entry.id)}
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
            <DialogTitle>Log Practice Hours</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="employer">Employer / Organisation</Label>
              <Input id="employer" placeholder="e.g. NHS Trust" required value={form.employer} onChange={e => setForm(f => ({ ...f, employer: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="role">Your Role</Label>
              <Input id="role" placeholder="e.g. Staff Nurse" required value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="setting">Care Setting</Label>
              <Input id="setting" placeholder="e.g. Acute ward, Community, GP practice" required value={form.setting} onChange={e => setForm(f => ({ ...f, setting: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="hours">Hours</Label>
              <Input id="hours" type="number" step="0.5" min="0.5" placeholder="e.g. 150" required value={form.hours} onChange={e => setForm(f => ({ ...f, hours: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="startDate">Start Date <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="startDate" type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="endDate">End Date <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="endDate" type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
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
