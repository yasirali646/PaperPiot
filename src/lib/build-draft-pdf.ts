import { jsPDF } from "jspdf";

import type { AgentResponse } from "@/lib/agent/schemas";
import { toPdfSafeText } from "@/lib/format-agent-text";

/**
 * Full draft pack: summary, steps, checklist, then each generated document.
 * Uses Helvetica-safe text and explicit left alignment to avoid stretched or clipped lines.
 */
export function buildDraftPdf(result: AgentResponse): void {
  const doc = new jsPDF();
  const margin = 16;
  const pageH = doc.internal.pageSize.getHeight();
  const pageW = doc.internal.pageSize.getWidth();
  const maxW = pageW - margin * 2;
  const y = { current: margin };

  doc.setCharSpace(0);
  doc.setLineHeightFactor(1.35);

  const lineHeightMm = (fontSize: number) =>
    (fontSize * doc.getLineHeightFactor()) / doc.internal.scaleFactor;

  const ensurePage = (needed: number) => {
    if (y.current + needed > pageH - margin) {
      doc.addPage();
      y.current = margin;
    }
  };

  const writeBlock = (
    text: string,
    fontSize: number,
    style: "normal" | "bold",
    gapAfter: number,
  ) => {
    const plain = toPdfSafeText(text);
    if (!plain) return;

    doc.setFontSize(fontSize);
    doc.setFont("helvetica", style);
    doc.setCharSpace(0);

    const lines = doc.splitTextToSize(plain, maxW);
    const lh = lineHeightMm(fontSize);

    for (const line of lines) {
      const str = typeof line === "string" ? line : String(line);
      ensurePage(lh);
      doc.text(str, margin, y.current, {
        align: "left",
        baseline: "top",
        renderingMode: "fill",
      });
      y.current += lh;
    }
    y.current += gapAfter;
  };

  writeBlock(
    `${result.processType.replace(/^\w/, (c) => c.toUpperCase())} - draft pack`,
    15,
    "bold",
    3,
  );
  writeBlock(result.intentSummary, 10, "normal", 6);

  writeBlock("Steps", 12, "bold", 2);
  result.navigator.steps.forEach((step, i) => {
    writeBlock(`${i + 1}. ${step.title}`, 11, "bold", 1);
    writeBlock(step.details, 10, "normal", 1);
    writeBlock(step.officeOrPortal, 9, "normal", 4);
  });

  if (result.navigator.feesAndTimelines.length) {
    writeBlock("Fees & timelines", 12, "bold", 2);
    result.navigator.feesAndTimelines.forEach((t) => {
      writeBlock(`- ${toPdfSafeText(t)}`, 10, "normal", 2);
    });
    y.current += 2;
  }

  writeBlock("Required documents", 12, "bold", 2);
  result.navigator.requiredDocuments.forEach((d) => {
    writeBlock(`- ${toPdfSafeText(d)}`, 10, "normal", 2);
  });
  y.current += 2;

  writeBlock("Draft documents", 12, "bold", 3);
  result.documentGenerator.documents.forEach((d) => {
    writeBlock(d.name, 11, "bold", 2);
    const body = toPdfSafeText(d.content);
    writeBlock(
      body || "(No body text was generated for this section.)",
      10,
      "normal",
      6,
    );
  });

  doc.save(`bureaucracy-draft-${result.processType}.pdf`);
}
