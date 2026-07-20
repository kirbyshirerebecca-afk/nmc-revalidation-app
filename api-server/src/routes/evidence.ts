import { Router } from "express";
import { db, evidenceTable, usersTable } from "@workspace/db";
import { eq, desc, and, count } from "drizzle-orm";
import { z } from "zod";

const FREE_EVIDENCE_LIMIT = 1;

const router = Router();

const saveSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  objectPath: z.string().min(1),
  contentType: z.string().min(1),
  originalName: z.string().min(1),
});

// GET all evidence for the logged-in user
router.get("/", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorised" }); return; }
  const userId = req.user!.id;
  const items = await db
    .select()
    .from(evidenceTable)
    .where(eq(evidenceTable.userId, userId))
    .orderBy(desc(evidenceTable.createdAt));
  res.json(items);
});

// POST save evidence metadata after upload
router.post("/", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorised" }); return; }

  const userId = req.user!.id;

  // Enforce free tier limit
  const [user] = await db.select({ tier: usersTable.tier }).from(usersTable).where(eq(usersTable.id, userId));
  if (user?.tier === "free") {
    const [{ value }] = await db.select({ value: count() }).from(evidenceTable).where(eq(evidenceTable.userId, userId));
    if (Number(value) >= FREE_EVIDENCE_LIMIT) {
      res.status(403).json({ error: "free_limit_reached" });
      return;
    }
  }

  const parse = saveSchema.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: "Invalid data" }); return; }

  const [created] = await db
    .insert(evidenceTable)
    .values({ ...parse.data, userId })
    .returning();
  res.status(201).json(created);
});

// DELETE an evidence item
router.delete("/:id", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorised" }); return; }
  const userId = req.user!.id;
  const id = Number(req.params.id);
  const [deleted] = await db
    .delete(evidenceTable)
    .where(and(eq(evidenceTable.id, id), eq(evidenceTable.userId, userId)))
    .returning();
  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ success: true });
});

export default router;
