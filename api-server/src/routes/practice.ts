import { Router } from "express";
import { db, practiceHoursTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const practiceBodySchema = z.object({
  employer: z.string().min(1),
  role: z.string().min(1),
  setting: z.string().min(1),
  hours: z.string().or(z.number()).transform((v) => String(v)),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// GET all practice hours for the logged-in user
router.get("/", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorised" });
    return;
  }
  const userId = req.user!.id;
  const logs = await db
    .select()
    .from(practiceHoursTable)
    .where(eq(practiceHoursTable.userId, userId))
    .orderBy(desc(practiceHoursTable.createdAt));
  res.json(logs);
});

// POST create a new practice hours entry
router.post("/", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorised" });
    return;
  }
  const parse = practiceBodySchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid data", issues: parse.error.issues });
    return;
  }
  const userId = req.user!.id;
  const [created] = await db
    .insert(practiceHoursTable)
    .values({ ...parse.data, userId })
    .returning();
  res.status(201).json(created);
});

// DELETE a practice hours entry (only owner can delete)
router.delete("/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorised" });
    return;
  }
  const userId = req.user!.id;
  const id = Number(req.params.id);
  const [deleted] = await db
    .delete(practiceHoursTable)
    .where(and(eq(practiceHoursTable.id, id), eq(practiceHoursTable.userId, userId)))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ success: true });
});

export default router;
