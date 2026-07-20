import { Router } from "express";
import PDFDocument from "pdfkit";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { cpdLogsTable, practiceHoursTable, reflectionsTable, usersTable } from "@workspace/db";

const router = Router();

// NMC brand colours
const NMC_NAVY = "#003087";
const NMC_TEAL = "#007C89";
const NMC_LIGHT_TEAL = "#E8F4F5";
const NMC_GREY = "#58595B";
const NMC_LIGHT_GREY = "#F5F5F5";
const NMC_MID_GREY = "#CCCCCC";
const WHITE = "#FFFFFF";
const BLACK = "#1A1A1A";

function drawPageHeader(doc: PDFKit.PDFDocument, title: string) {
  // Navy top bar
  doc.rect(0, 0, doc.page.width, 60).fill(NMC_NAVY);

  // NMC wordmark
  doc
    .fillColor(WHITE)
    .font("Helvetica-Bold")
    .fontSize(18)
    .text("NMC", 50, 18);

  doc
    .fillColor(WHITE)
    .font("Helvetica")
    .fontSize(9)
    .text("Nursing and Midwifery Council", 50, 38);

  // Section title on the right
  doc
    .fillColor(WHITE)
    .font("Helvetica")
    .fontSize(9)
    .text(title, 0, 24, { align: "right", width: doc.page.width - 50 });

  // Teal accent stripe
  doc.rect(0, 60, doc.page.width, 4).fill(NMC_TEAL);

  doc.moveDown(0);
}

function drawPageFooter(doc: PDFKit.PDFDocument, pageNum: number) {
  const bottom = doc.page.height - 40;
  doc.rect(0, bottom - 5, doc.page.width, 1).fill(NMC_MID_GREY);

  doc
    .fillColor(NMC_GREY)
    .font("Helvetica")
    .fontSize(8)
    .text(
      `NMC Revalidation Portfolio  |  Generated ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`,
      50,
      bottom + 4
    )
    .text(`Page ${pageNum}`, 0, bottom + 4, { align: "right", width: doc.page.width - 50 });
}

function sectionHeading(doc: PDFKit.PDFDocument, text: string, y?: number) {
  const yPos = y ?? doc.y;
  doc.rect(50, yPos, doc.page.width - 100, 28).fill(NMC_NAVY);
  doc
    .fillColor(WHITE)
    .font("Helvetica-Bold")
    .fontSize(11)
    .text(text.toUpperCase(), 62, yPos + 8, { width: doc.page.width - 124 });
  doc.y = yPos + 36;
}

function subHeading(doc: PDFKit.PDFDocument, text: string) {
  doc
    .fillColor(NMC_TEAL)
    .font("Helvetica-Bold")
    .fontSize(10)
    .text(text, 50, doc.y)
    .moveDown(0.3);
}

function labelValue(doc: PDFKit.PDFDocument, label: string, value: string, x = 50, width?: number) {
  const w = width ?? doc.page.width - 100;
  doc
    .fillColor(NMC_GREY)
    .font("Helvetica-Bold")
    .fontSize(8)
    .text(label, x, doc.y, { continued: false, width: w });
  doc
    .fillColor(BLACK)
    .font("Helvetica")
    .fontSize(9)
    .text(value || "—", x, doc.y, { width: w })
    .moveDown(0.4);
}

function bodyText(doc: PDFKit.PDFDocument, text: string, x = 50) {
  doc
    .fillColor(BLACK)
    .font("Helvetica")
    .fontSize(9)
    .text(text || "—", x, doc.y, { width: doc.page.width - 100, lineGap: 2 })
    .moveDown(0.5);
}

function divider(doc: PDFKit.PDFDocument) {
  doc.rect(50, doc.y, doc.page.width - 100, 0.5).fill(NMC_MID_GREY);
  doc.y += 8;
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number, pageNum: { n: number }, sectionTitle: string) {
  if (doc.y + needed > doc.page.height - 60) {
    pageNum.n += 1;
    doc.addPage();
    drawPageHeader(doc, sectionTitle);
    drawPageFooter(doc, pageNum.n);
    doc.y = 80;
  }
}

router.get("/portfolio", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  // Premium-only feature
  const { stripeStorage } = await import("../stripeStorage");
  const userId: string = req.user!.id;
  const dbUser = await stripeStorage.getUser(userId);
  if (!dbUser || dbUser.tier !== "premium") {
    return res.status(403).json({ error: "PDF export is a premium feature. Please upgrade to access it." });
  }

  try {
    // Fetch only this user's data
    const [cpdLogs, practiceHours, reflections] = await Promise.all([
      db.select().from(cpdLogsTable).where(eq(cpdLogsTable.userId, userId)).orderBy(cpdLogsTable.date),
      db.select().from(practiceHoursTable).where(eq(practiceHoursTable.userId, userId)).orderBy(practiceHoursTable.createdAt),
      db.select().from(reflectionsTable).where(eq(reflectionsTable.userId, userId)).orderBy(reflectionsTable.createdAt),
    ]);

    const pageNum = { n: 1 };
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 80, bottom: 60, left: 50, right: 50 },
      info: {
        Title: "NMC Revalidation Portfolio",
        Author: "NMC Revalidation App",
        Subject: "Nursing and Midwifery Council Revalidation Portfolio",
      },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="NMC_Revalidation_Portfolio_${new Date().toISOString().split("T")[0]}.pdf"`
    );
    doc.pipe(res);

    // ─── COVER PAGE ────────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(NMC_NAVY);

    // Teal accent band
    doc.rect(0, doc.page.height * 0.45, doc.page.width, 6).fill(NMC_TEAL);

    // NMC Wordmark
    doc
      .fillColor(WHITE)
      .font("Helvetica-Bold")
      .fontSize(42)
      .text("NMC", 60, 80);

    doc
      .fillColor(NMC_TEAL)
      .font("Helvetica")
      .fontSize(13)
      .text("Nursing and Midwifery Council", 60, 130);

    // Main title
    doc
      .fillColor(WHITE)
      .font("Helvetica-Bold")
      .fontSize(32)
      .text("Revalidation", 60, doc.page.height * 0.48 + 30);

    doc
      .fillColor(WHITE)
      .font("Helvetica-Bold")
      .fontSize(32)
      .text("Portfolio", 60, doc.page.height * 0.48 + 72);

    // Subtitle
    doc
      .fillColor(NMC_TEAL)
      .font("Helvetica")
      .fontSize(12)
      .text("Complete Revalidation Submission", 60, doc.page.height * 0.48 + 118);

    // Metadata box
    const metaY = doc.page.height * 0.72;
    doc.rect(50, metaY, doc.page.width - 100, 120).fill("rgba(255,255,255,0.08)");

    const generatedDate = new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    doc
      .fillColor(NMC_MID_GREY)
      .font("Helvetica")
      .fontSize(9)
      .text("DATE GENERATED", 70, metaY + 16);
    doc
      .fillColor(WHITE)
      .font("Helvetica-Bold")
      .fontSize(11)
      .text(generatedDate, 70, metaY + 30);

    doc
      .fillColor(NMC_MID_GREY)
      .font("Helvetica")
      .fontSize(9)
      .text("TOTAL CPD ENTRIES", 70, metaY + 60);
    doc
      .fillColor(WHITE)
      .font("Helvetica-Bold")
      .fontSize(11)
      .text(String(cpdLogs.length), 70, metaY + 74);

    doc
      .fillColor(NMC_MID_GREY)
      .font("Helvetica")
      .fontSize(9)
      .text("PRACTICE HOUR ENTRIES", 240, metaY + 60);
    doc
      .fillColor(WHITE)
      .font("Helvetica-Bold")
      .fontSize(11)
      .text(String(practiceHours.length), 240, metaY + 74);

    doc
      .fillColor(NMC_MID_GREY)
      .font("Helvetica")
      .fontSize(9)
      .text("REFLECTIVE ACCOUNTS", 410, metaY + 60);
    doc
      .fillColor(WHITE)
      .font("Helvetica-Bold")
      .fontSize(11)
      .text(String(reflections.length), 410, metaY + 74);

    // Footer note
    doc
      .fillColor(NMC_MID_GREY)
      .font("Helvetica")
      .fontSize(8)
      .text(
        "This portfolio was generated digitally. Please review all entries before submitting to your confirmer.",
        50,
        doc.page.height - 60,
        { width: doc.page.width - 100, align: "center" }
      );

    // ─── CPD LOG SECTION ───────────────────────────────────────────────────────
    pageNum.n += 1;
    doc.addPage();
    drawPageHeader(doc, "CPD Log");
    drawPageFooter(doc, pageNum.n);
    doc.y = 80;

    // NMC requirement callout
    doc.rect(50, doc.y, doc.page.width - 100, 36).fill(NMC_LIGHT_TEAL);
    doc
      .fillColor(NMC_TEAL)
      .font("Helvetica-Bold")
      .fontSize(8)
      .text("NMC REQUIREMENT", 62, doc.y + 6);
    doc
      .fillColor(NMC_NAVY)
      .font("Helvetica")
      .fontSize(8)
      .text(
        "35 hours of CPD in every 3-year revalidation period, of which at least 20 hours must be participatory.",
        62,
        doc.y + 17,
        { width: doc.page.width - 130 }
      );
    doc.y += 44;

    sectionHeading(doc, "Continuing Professional Development Log");

    if (cpdLogs.length === 0) {
      doc
        .fillColor(NMC_GREY)
        .font("Helvetica")
        .fontSize(10)
        .text("No CPD entries recorded.", 50, doc.y)
        .moveDown();
    } else {
      // Totals summary
      const totalHours = cpdLogs.reduce((sum, l) => sum + parseFloat(String(l.hours ?? 0)), 0);
      const participatoryHours = cpdLogs
        .filter((l) => l.method?.toLowerCase() === "participatory")
        .reduce((sum, l) => sum + parseFloat(String(l.hours ?? 0)), 0);

      doc.rect(50, doc.y, doc.page.width - 100, 44).fill(NMC_LIGHT_GREY);
      doc
        .fillColor(NMC_GREY)
        .font("Helvetica-Bold")
        .fontSize(8)
        .text("TOTAL HOURS", 70, doc.y + 8);
      doc
        .fillColor(NMC_NAVY)
        .font("Helvetica-Bold")
        .fontSize(18)
        .text(`${totalHours.toFixed(1)}`, 70, doc.y + 18);

      doc
        .fillColor(NMC_GREY)
        .font("Helvetica-Bold")
        .fontSize(8)
        .text("PARTICIPATORY HOURS", 220, doc.y + 8);
      doc
        .fillColor(NMC_NAVY)
        .font("Helvetica-Bold")
        .fontSize(18)
        .text(`${participatoryHours.toFixed(1)}`, 220, doc.y + 18);

      doc
        .fillColor(NMC_GREY)
        .font("Helvetica-Bold")
        .fontSize(8)
        .text("ONLINE / SELF-DIRECTED", 370, doc.y + 8);
      doc
        .fillColor(NMC_NAVY)
        .font("Helvetica-Bold")
        .fontSize(18)
        .text(`${(totalHours - participatoryHours).toFixed(1)}`, 370, doc.y + 18);
      doc.y += 52;

      // Table header
      const colX = [50, 120, 300, 400, 480];
      doc.rect(50, doc.y, doc.page.width - 100, 20).fill(NMC_NAVY);
      doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(8);
      doc.text("DATE", colX[0] + 4, doc.y + 6);
      doc.text("TOPIC", colX[1] + 4, doc.y + 6);
      doc.text("METHOD", colX[2] + 4, doc.y + 6);
      doc.text("HOURS", colX[3] + 4, doc.y + 6);
      doc.text("EVIDENCE", colX[4] + 4, doc.y + 6);
      doc.y += 22;

      cpdLogs.forEach((entry, i) => {
        ensureSpace(doc, 22, pageNum, "CPD Log");

        const rowY = doc.y;
        if (i % 2 === 0) {
          doc.rect(50, rowY, doc.page.width - 100, 20).fill(NMC_LIGHT_GREY);
        } else {
          doc.rect(50, rowY, doc.page.width - 100, 20).fill(WHITE);
        }

        doc.fillColor(BLACK).font("Helvetica").fontSize(8);
        const dateStr = entry.date
          ? new Date(entry.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
          : "—";
        doc.text(dateStr, colX[0] + 4, rowY + 6, { width: 65 });
        doc.text(entry.topic || "—", colX[1] + 4, rowY + 6, { width: 175 });
        doc.text(entry.method || "—", colX[2] + 4, rowY + 6, { width: 95 });
        doc.text(`${parseFloat(String(entry.hours ?? 0)).toFixed(1)} hrs`, colX[3] + 4, rowY + 6, { width: 75 });
        doc.text(entry.evidenceUrl ? "Attached" : "None", colX[4] + 4, rowY + 6, { width: 70 });
        doc.y = rowY + 22;
      });
    }

    // ─── PRACTICE HOURS SECTION ────────────────────────────────────────────────
    pageNum.n += 1;
    doc.addPage();
    drawPageHeader(doc, "Practice Hours");
    drawPageFooter(doc, pageNum.n);
    doc.y = 80;

    doc.rect(50, doc.y, doc.page.width - 100, 36).fill(NMC_LIGHT_TEAL);
    doc
      .fillColor(NMC_TEAL)
      .font("Helvetica-Bold")
      .fontSize(8)
      .text("NMC REQUIREMENT", 62, doc.y + 6);
    doc
      .fillColor(NMC_NAVY)
      .font("Helvetica")
      .fontSize(8)
      .text(
        "450 hours of practice in the most recent 3-year period prior to the renewal of registration.",
        62,
        doc.y + 17,
        { width: doc.page.width - 130 }
      );
    doc.y += 44;

    sectionHeading(doc, "Practice Hours");

    if (practiceHours.length === 0) {
      doc.fillColor(NMC_GREY).font("Helvetica").fontSize(10).text("No practice hour entries recorded.", 50, doc.y).moveDown();
    } else {
      const totalPracticeHours = practiceHours.reduce((sum, p) => sum + parseFloat(String(p.hours ?? 0)), 0);

      doc.rect(50, doc.y, doc.page.width - 100, 44).fill(NMC_LIGHT_GREY);
      doc.fillColor(NMC_GREY).font("Helvetica-Bold").fontSize(8).text("TOTAL PRACTICE HOURS", 70, doc.y + 8);
      doc.fillColor(NMC_NAVY).font("Helvetica-Bold").fontSize(18).text(`${totalPracticeHours.toFixed(1)}`, 70, doc.y + 18);
      doc.fillColor(NMC_GREY).font("Helvetica-Bold").fontSize(8).text("ENTRIES", 270, doc.y + 8);
      doc.fillColor(NMC_NAVY).font("Helvetica-Bold").fontSize(18).text(`${practiceHours.length}`, 270, doc.y + 18);
      doc.y += 52;

      practiceHours.forEach((entry, i) => {
        ensureSpace(doc, 110, pageNum, "Practice Hours");

        const cardY = doc.y;
        doc.rect(50, cardY, doc.page.width - 100, 100).fill(i % 2 === 0 ? NMC_LIGHT_GREY : WHITE);
        doc.rect(50, cardY, 4, 100).fill(NMC_TEAL);

        doc
          .fillColor(NMC_NAVY)
          .font("Helvetica-Bold")
          .fontSize(11)
          .text(entry.employer || "—", 64, cardY + 10, { width: doc.page.width - 140 });

        const leftCol = 64;
        const rightCol = 64 + (doc.page.width - 140) / 2;

        doc.fillColor(NMC_GREY).font("Helvetica-Bold").fontSize(7).text("ROLE", leftCol, cardY + 28);
        doc.fillColor(BLACK).font("Helvetica").fontSize(9).text(entry.role || "—", leftCol, cardY + 38, { width: 200 });

        doc.fillColor(NMC_GREY).font("Helvetica-Bold").fontSize(7).text("SETTING", rightCol, cardY + 28);
        doc.fillColor(BLACK).font("Helvetica").fontSize(9).text(entry.setting || "—", rightCol, cardY + 38, { width: 200 });

        doc.fillColor(NMC_GREY).font("Helvetica-Bold").fontSize(7).text("HOURS WORKED", leftCol, cardY + 64);
        doc
          .fillColor(NMC_TEAL)
          .font("Helvetica-Bold")
          .fontSize(14)
          .text(`${parseFloat(String(entry.hours ?? 0)).toFixed(1)} hrs`, leftCol, cardY + 74);

        doc.y = cardY + 108;
      });
    }

    // ─── REFLECTIVE ACCOUNTS SECTION ──────────────────────────────────────────
    pageNum.n += 1;
    doc.addPage();
    drawPageHeader(doc, "Reflective Accounts");
    drawPageFooter(doc, pageNum.n);
    doc.y = 80;

    doc.rect(50, doc.y, doc.page.width - 100, 36).fill(NMC_LIGHT_TEAL);
    doc
      .fillColor(NMC_TEAL)
      .font("Helvetica-Bold")
      .fontSize(8)
      .text("NMC REQUIREMENT", 62, doc.y + 6);
    doc
      .fillColor(NMC_NAVY)
      .font("Helvetica")
      .fontSize(8)
      .text(
        "5 written reflective accounts on CPD and/or practice-related feedback and/or an event or experience in practice.",
        62,
        doc.y + 17,
        { width: doc.page.width - 130 }
      );
    doc.y += 44;

    sectionHeading(doc, "Reflective Accounts");

    if (reflections.length === 0) {
      doc.fillColor(NMC_GREY).font("Helvetica").fontSize(10).text("No reflective accounts recorded.", 50, doc.y).moveDown();
    } else {
      reflections.forEach((reflection, i) => {
        ensureSpace(doc, 60, pageNum, "Reflective Accounts");

        // Reflection header
        doc.rect(50, doc.y, doc.page.width - 100, 32).fill(NMC_LIGHT_GREY);
        doc.rect(50, doc.y, 4, 32).fill(NMC_NAVY);
        doc
          .fillColor(NMC_GREY)
          .font("Helvetica-Bold")
          .fontSize(8)
          .text(`REFLECTIVE ACCOUNT ${i + 1} OF ${reflections.length}`, 64, doc.y + 6);
        doc
          .fillColor(NMC_NAVY)
          .font("Helvetica-Bold")
          .fontSize(12)
          .text(reflection.title || "Untitled Reflection", 64, doc.y + 16, { width: doc.page.width - 130 });
        doc.y += 40;

        // The 4 NMC parts — only show the AI-generated reflection if present, otherwise draft notes
        if (reflection.aiGeneratedReflection) {
          // Try to parse structured JSON; otherwise show as-is
          let structured: Record<string, string> | null = null;
          try {
            structured = JSON.parse(reflection.aiGeneratedReflection);
          } catch {
            /* not JSON */
          }

          const parts: Array<{ label: string; key: string }> = [
            { label: "1. What was the nature of the CPD activity or feedback received?", key: "natureOfCpd" },
            { label: "2. What did you learn from the CPD activity or feedback?", key: "whatLearned" },
            { label: "3. How did you change or improve your practice as a result?", key: "practiceChanges" },
            { label: "4. How is this relevant to the Code?", key: "nmcCodeRelation" },
          ];

          if (structured) {
            parts.forEach((part) => {
              ensureSpace(doc, 80, pageNum, "Reflective Accounts");
              subHeading(doc, part.label);
              bodyText(doc, structured![part.key] || "—");
              divider(doc);
            });
          } else {
            subHeading(doc, "Reflection");
            bodyText(doc, reflection.aiGeneratedReflection);
            divider(doc);
          }
        } else if (reflection.draftNotes) {
          subHeading(doc, "Draft Notes");
          bodyText(doc, reflection.draftNotes);
          divider(doc);
        } else {
          doc.fillColor(NMC_GREY).font("Helvetica").fontSize(9).text("No content recorded for this reflection.", 50, doc.y).moveDown();
          divider(doc);
        }

        doc.moveDown(0.5);
      });
    }

    // ─── DECLARATION PAGE ─────────────────────────────────────────────────────
    pageNum.n += 1;
    doc.addPage();
    drawPageHeader(doc, "Declaration");
    drawPageFooter(doc, pageNum.n);
    doc.y = 80;

    sectionHeading(doc, "Confirmation and Declaration");
    doc.moveDown(0.5);

    doc
      .fillColor(BLACK)
      .font("Helvetica")
      .fontSize(10)
      .text(
        "This portfolio has been compiled in line with NMC revalidation requirements. The registrant declares that:",
        50,
        doc.y,
        { width: doc.page.width - 100 }
      )
      .moveDown(1);

    const declarations = [
      "All CPD activities have been completed within the revalidation period.",
      "All practice hours have been undertaken in a relevant setting.",
      "All reflective accounts are based on real professional experiences.",
      "The information provided is accurate and complete to the best of my knowledge.",
      "I understand my obligations under the NMC Code.",
    ];

    declarations.forEach((d) => {
      doc
        .rect(50, doc.y, 10, 10)
        .strokeColor(NMC_NAVY)
        .lineWidth(1)
        .stroke();
      doc
        .fillColor(BLACK)
        .font("Helvetica")
        .fontSize(9)
        .text(d, 70, doc.y, { width: doc.page.width - 120 })
        .moveDown(0.8);
    });

    doc.moveDown(2);

    // Signature lines
    const sigY = doc.y;
    doc.rect(50, sigY, 200, 0.5).fill(BLACK);
    doc.rect(310, sigY, 200, 0.5).fill(BLACK);
    doc
      .fillColor(NMC_GREY)
      .font("Helvetica")
      .fontSize(8)
      .text("Registrant Signature", 50, sigY + 6)
      .text("Date", 310, sigY + 6);

    doc.moveDown(3);

    const confirmY = doc.y;
    doc.rect(50, confirmY, 200, 0.5).fill(BLACK);
    doc.rect(310, confirmY, 200, 0.5).fill(BLACK);
    doc
      .fillColor(NMC_GREY)
      .font("Helvetica")
      .fontSize(8)
      .text("Confirmer Signature", 50, confirmY + 6)
      .text("Date", 310, confirmY + 6);

    doc.moveDown(1.5);

    doc
      .fillColor(NMC_GREY)
      .font("Helvetica")
      .fontSize(8)
      .text(
        "For guidance on completing your revalidation, visit www.nmc.org.uk/revalidation",
        50,
        doc.y,
        { width: doc.page.width - 100, align: "center" }
      );

    doc.end();
  } catch (err) {
    req.log.error({ err }, "Error generating portfolio PDF");
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to generate portfolio PDF" });
    }
  }
});

export default router;
