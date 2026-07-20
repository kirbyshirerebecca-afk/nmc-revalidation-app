import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUpload } from "@workspace/object-storage-web";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Image, Plus, Trash2, Upload, FileImage, File, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EvidenceItem {
  id: number;
  title: string;
  description?: string;
  objectPath: string;
  contentType: string;
  originalName: string;
  createdAt: string;
}

async function fetchEvidence(): Promise<EvidenceItem[]> {
  const res = await fetch("/api/evidence", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch evidence");
  return res.json();
}

const emptyForm = { title: "", description: "" };

export default function Evidence() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["evidence"],
    queryFn: fetchEvidence,
  });

  const { uploadFile, isUploading, progress } = useUpload({
    onSuccess: async (response) => {
      // Save metadata to our DB after successful upload
      const res = await fetch("/api/evidence", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description || undefined,
          objectPath: response.objectPath,
          contentType: selectedFile!.type,
          originalName: selectedFile!.name,
        }),
      });
      if (res.status === 403) {
        setOpen(false);
        setLimitReached(true);
        return;
      }
      if (!res.ok) throw new Error("Failed to save evidence record");
      queryClient.invalidateQueries({ queryKey: ["evidence"] });
      toast({ title: "Evidence uploaded", description: "Your file has been saved." });
      setOpen(false);
      setForm(emptyForm);
      setSelectedFile(null);
      setPreview(null);
    },
    onError: () => {
      toast({ title: "Upload failed", description: "Please try again.", variant: "destructive" });
    },
  });

  const [, navigate] = useLocation();

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/evidence/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["evidence"] }),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
    // Pre-fill title from filename if empty
    if (!form.title) {
      setForm(f => ({ ...f, title: file.name.replace(/\.[^/.]+$/, "") }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    await uploadFile(selectedFile);
  };

  const isImage = (contentType: string) => contentType.startsWith("image/");

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Evidence</h1>
          <p className="text-muted-foreground mt-1">
            Upload thank-you cards, certificates, and other evidence for your portfolio.
          </p>
        </div>
        <Button className="gap-2" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4" />
          Upload Evidence
        </Button>
      </div>

      {/* Paywall banner */}
      {limitReached && (
        <div className="p-5 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-amber-900">Free upload used</h4>
            <p className="text-sm text-amber-800 mt-1">
              You've used your 1 free evidence upload. Upgrade to Premium for unlimited uploads, AI reflections, and PDF portfolio export.
            </p>
            <Button className="mt-3" size="sm" onClick={() => navigate("/pricing")}>
              Upgrade to Premium — £39.99/year
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : items.length === 0 ? (
        <Card className="border-dashed bg-secondary/30">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Image className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">No evidence uploaded yet</h3>
            <p className="text-muted-foreground text-sm max-w-sm mb-4">
              Upload screenshots of thank-you cards, certificates, or any other evidence supporting your revalidation.
            </p>
            <Button variant="outline" onClick={() => setOpen(true)}>Upload your first item</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden group">
              {isImage(item.contentType) ? (
                <div className="aspect-square bg-secondary/30 relative overflow-hidden">
                  <img
                    src={`/api/storage${item.objectPath}`}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-square bg-secondary/30 flex items-center justify-center">
                  <File className="w-10 h-10 text-muted-foreground" />
                </div>
              )}
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(item.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => deleteMutation.mutate(item.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setSelectedFile(null); setPreview(null); setForm(emptyForm); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Evidence</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* File picker */}
            <div
              className="border-2 border-dashed border-input rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-secondary/30 transition-colors relative"
              onClick={() => document.getElementById("evidence-file")?.click()}
            >
              <input
                id="evidence-file"
                type="file"
                accept="image/*,.pdf"
                className="sr-only"
                onChange={handleFileChange}
              />
              {preview ? (
                <img src={preview} alt="Preview" className="mx-auto max-h-40 rounded object-contain" />
              ) : selectedFile ? (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <File className="w-8 h-8" />
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <FileImage className="w-8 h-8" />
                  <p className="text-sm font-medium">Tap to choose a photo or file</p>
                  <p className="text-xs">Photos, screenshots, PDFs accepted</p>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="ev-title">Title</Label>
              <Input
                id="ev-title"
                placeholder="e.g. Thank you card from patient"
                required
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ev-desc">Description <span className="text-muted-foreground">(optional)</span></Label>
              <Textarea
                id="ev-desc"
                placeholder="e.g. Received from patient after discharge, June 2026"
                rows={2}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>

            {/* Upload progress */}
            {isUploading && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Uploading…</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!selectedFile || !form.title || isUploading} className="gap-2">
                <Upload className="w-4 h-4" />
                {isUploading ? "Uploading…" : "Upload"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
