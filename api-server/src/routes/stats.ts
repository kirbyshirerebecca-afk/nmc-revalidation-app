import { Router } from "express";
import { eq, sum, count } from "drizzle-orm";
import { db, cpdLogsTable, practiceHoursTable, reflectionsTable } from "@workspace/db";

const router = Router();

/**
 * GET /api/stats
 * Returns real CPD hours, practice hours, and reflection counts for the
 * authenticated user.
 */
router.get("/", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const userId: string = req.user!.id;

  const [cpdResult, practiceResult, reflectionResult] = await Promise.all([
    db
      .select({ total: sum(cpdLogsTable.hours) })
      .from(cpdLogsTable)
      .where(eq(cpdLogsTable.userId, userId)),
    db
      .select({ total: sum(practiceHoursTable.hours) })
      .from(practiceHoursTable)
      .where(eq(practiceHoursTable.userId, userId)),
    db
      .select({ total: count(reflectionsTable.id) })
      .from(reflectionsTable)
      .where(eq(reflectionsTable.userId, userId)),
  ]);

  res.json({
    cpdHours: parseFloat(cpdResult[0]?.total ?? "0") || 0,
    practiceHours: parseFloat(practiceResult[0]?.total ?? "0") || 0,
    reflectionCount: reflectionResult[0]?.total ?? 0,
  });
});

export default router;
