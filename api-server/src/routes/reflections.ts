import { Router } from "express";
import OpenAI from "openai";
import { EnhanceReflectionBody } from "@workspace/api-zod";
import { db, reflectionsTable, usersTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const FREE_REFLECTION_LIMIT = 1;

console.log("[AI] baseURL:", process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ? "SET" : "MISSING");
console.log("[AI] apiKey:", process.env.AI_INTEGRATIONS_OPENAI_API_KEY ? "SET" : "MISSING");

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const NMC_SYSTEM_PROMPT = `You are an expert NMC (Nursing and Midwifery Council) revalidation assistant. 
Your role is to help nurses write structured, professional reflections for their NMC revalidation portfolio.

When given raw notes or bullet points from a nurse about a clinical experience, feedback, or CPD activity, 
you must produce a structured reflection with exactly 4 parts following the NMC revalidation framework.

Respond ONLY with a valid JSON object with these exact keys:
- natureOfCpd: A well-written paragraph describing the nature of the CPD activity or feedback received
- whatLearned: A well-written paragraph describing what the nurse learned from this experience
- practiceChanges: A well-written paragraph describing how the nurse changed or plans to change their practice as a result
- nmcCodeRelation: A well-written paragraph explaining how this experience relates to the NMC Code (with specific reference to relevant sections such as prioritising people, practising effectively, preserving safety, or promoting professionalism and trust)

Write in first person, in a professional and reflective tone appropriate for NMC revalidation submission. 
Each section should be 2-4 sentences minimum, substantive and specific.
Do not add any text outside the JSON object.`;

// GET all saved reflections for the logged-in user
router.get("/", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorised" });
    return;
  }
  const userId = req.user!.id;
  const reflections = await db
    .select()
    .from(reflectionsTable)
    .where(eq(reflectionsTable.userId, userId));
  res.json(reflections);
});

// POST save a reflection to portfolio
router.post("/", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorised" });
    return;
  }
  const userId = req.user!.id;

  const bodySchema = z.object({
    title: z.string().min(1),
    draftNotes: z.string().optional(),
    aiGeneratedReflection: z.string().optional(),
  });
  const parse = bodySchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid data" });
    return;
  }

  const [created] = await db
    .insert(reflectionsTable)
    .values({ ...parse.data, userId })
    .returning();
  res.status(201).json(created);
});

// DELETE a saved reflection
router.delete("/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorised" });
    return;
  }
  const userId = req.user!.id;
  const id = Number(req.params.id);
  const [deleted] = await db
    .delete(reflectionsTable)
    .where(eq(reflectionsTable.id, id))
    .returning();
  if (!deleted || deleted.userId !== userId) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ success: true });
});

// POST enhance reflection with AI (limit-checked)
router.post("/enhance", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorised" });
    return;
  }

  const userId = req.user!.id;

  // Check tier and enforce free limit
  const [user] = await db
    .select({ tier: usersTable.tier })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (user?.tier === "free") {
    const [{ value }] = await db
      .select({ value: count() })
      .from(reflectionsTable)
      .where(eq(reflectionsTable.userId, userId));
    if (Number(value) >= FREE_REFLECTION_LIMIT) {
      res.status(403).json({ error: "free_limit_reached" });
      return;
    }
  }

  const parseResult = EnhanceReflectionBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid request: notes field is required" });
    return;
  }

  const { notes } = parseResult.data;

  if (!notes.trim()) {
    res.status(400).json({ error: "Notes cannot be empty" });
    return;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5-nano",
      max_completion_tokens: 2000,
      messages: [
        { role: "system", content: NMC_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Please format the following notes into a structured NMC reflection:\n\n${notes}`,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      res.status(500).json({ error: "No response received from AI" });
      return;
    }

    let structured: {
      natureOfCpd: string;
      whatLearned: string;
      practiceChanges: string;
      nmcCodeRelation: string;
    };

    try {
      structured = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) {
        req.log.error({ content }, "Failed to parse AI response as JSON");
        res.status(500).json({ error: "Failed to parse AI response" });
        return;
      }
      structured = JSON.parse(match[0]);
    }

    if (
      !structured.natureOfCpd ||
      !structured.whatLearned ||
      !structured.practiceChanges ||
      !structured.nmcCodeRelation
    ) {
      res.status(500).json({ error: "AI response missing required fields" });
      return;
    }

    res.json(structured);
  } catch (err) {
    req.log.error({ err }, "Error calling OpenAI API");
    res.status(500).json({ error: "Failed to generate reflection. Please try again." });
  }
});

export default router;
