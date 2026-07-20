import { Router } from "express";
import { db, cpdLogsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const cpdBodySchema = z.object({
  date: z.string().min(1),
  topic: z.string().min(1),
  method: z.enum(["participatory", "online"]),
  hours: z.string().or(z.number()).transform((v) => String(v)),
  evidenceUrl: z.string().optional(),
});

// GET all CPD logs for the logged-in user
router.get("/", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorised" });
    return;
  }
  const userId = req.user!.id;
  const logs = await db
    .select()
    .from(cpdLogsTable)
    .where(eq(cpdLogsTable.userId, userId))
    .orderBy(desc(cpdLogsTable.date));
  res.json(logs);
});

// POST create a new CPD log
router.post("/", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorised" });
    return;
  }
  const parse = cpdBodySchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid data", issues: parse.error.issues });
    return;
  }
  const userId = req.user!.id;
  const [created] = await db
    .insert(cpdLogsTable)
    .values({ ...parse.data, userId })
    .returning();
  res.status(201).json(created);
});

// DELETE a CPD log (only owner can delete)
router.delete("/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorised" });
    return;
  }
  const userId = req.user!.id;
  const id = Number(req.params.id);
  const [deleted] = await db
    .delete(cpdLogsTable)
    .where(and(eq(cpdLogsTable.id, id), eq(cpdLogsTable.userId, userId)))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ success: true });
});

export default router;
