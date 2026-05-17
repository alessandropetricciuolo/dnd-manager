import fs from "fs";
import path from "path";
import { PDFDocument } from "pdf-lib";
import {
  appendCharacterStoryToPdf,
  MAX_CHARACTER_STORY_PDF_CHARS,
  storyInputToPdfPlainText,
} from "@/lib/pdf/append-character-story-page";
import { sanitizePdfAttachmentFileName } from "@/lib/security/pdf-filename";

function resolveTemplatePath(): string | null {
  const envPath = process.env.SHEET_BASE_PDF_PATH?.trim();
  const candidates = [
    envPath || "",
    path.join(process.cwd(), "public", "Scheda_Base.pdf"),
    path.join(process.cwd(), "dnd-manager", "public", "Scheda_Base.pdf"),
    path.join(process.cwd(), "Scheda_Base.pdf"),
    path.join(process.cwd(), "..", "Scheda_Base.pdf"),
    path.join(process.cwd(), "..", "dnd-manager", "public", "Scheda_Base.pdf"),
  ].filter(Boolean);
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function resolveTemplateBytes(req: Request): Promise<Uint8Array | null> {
  const p = resolveTemplatePath();
  if (p) return fs.readFileSync(p);

  const origin = new URL(req.url).origin;
  const baseCandidates = [
    process.env.SHEET_BASE_PDF_URL?.trim() || "",
    `${origin}/Scheda_Base.pdf`,
    `${origin}/dnd-manager/Scheda_Base.pdf`,
    `${origin}/public/Scheda_Base.pdf`,
  ].filter(Boolean);

  for (const url of baseCandidates) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      const ab = await res.arrayBuffer();
      if (ab.byteLength > 1000) return new Uint8Array(ab);
    } catch {
      // prova URL successivo
    }
  }
  return null;
}

function valueToString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v);
}

function isMarked(value: string): boolean {
  const v = value.trim().toLowerCase();
  return v === "x" || v === "true" || v === "1" || v === "yes" || v === "/yes" || v === "on";
}

function enrichFieldsFromSpellList(fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...fields };
  const listRaw = Array.isArray(fields.SpellList) ? (fields.SpellList as Array<Record<string, unknown>>) : [];
  const list = listRaw.filter((s) => {
    const lvl = Number.parseInt(valueToString(s?.level), 10);
    return Number.isFinite(lvl) && lvl >= 1;
  });
  if (!list.length) return out;
  for (let i = 0; i < Math.min(20, list.length); i += 1) {
    const row = i + 1;
    const s = list[i] ?? {};
    const level = valueToString(s.level);
    out[`Row_${row}_Lvl`] = level;
    out[`Row_${row}_Name`] = valueToString(s.name);
    out[`Row_${row}_Desc`] = valueToString(s.desc);
    out[`Row_${row}_V`] = isMarked(valueToString(s.v)) ? "x" : "";
    out[`Row_${row}_S`] = isMarked(valueToString(s.s)) ? "x" : "";
    out[`Row_${row}_Conc`] = isMarked(valueToString(s.conc)) ? "x" : "";
    out[`Row_${row}_Rit`] = isMarked(valueToString(s.rit)) ? "x" : "";
  }
  return out;
}

export async function POST(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as {
      fields?: Record<string, unknown>;
      fileName?: string;
      /** Testo lungo dalla card PG o dal generatore: aggiunto come pagina/e dopo la Scheda_Base. */
      storyText?: string | null;
      narrativeText?: string | null;
      /** Riga contestuale sotto il titolo (es. nome · classe · background). */
      storyContextLine?: string | null;
    };
    const fields = enrichFieldsFromSpellList(body?.fields ?? {});
    const templateBytes = await resolveTemplateBytes(req);
    if (!templateBytes) {
      return Response.json(
        {
          success: false,
          error:
            "Template PDF non trovato. Pubblica `Scheda_Base.pdf` sotto `/public` oppure configura `SHEET_BASE_PDF_PATH` / `SHEET_BASE_PDF_URL`.",
        },
        { status: 404 }
      );
    }

    const pdfDoc = await PDFDocument.load(templateBytes);
    const form = pdfDoc.getForm();
    const formFields = form.getFields();
    const byName = new Map(formFields.map((f) => [f.getName(), f]));

    for (const [key, raw] of Object.entries(fields)) {
      const fld = byName.get(key);
      if (!fld) continue;
      const val = valueToString(raw);
      // Checkbox / radio via API comune setText fallback.
      if ("check" in fld && typeof (fld as { check?: () => void }).check === "function") {
        if (isMarked(val)) {
          (fld as { check: () => void }).check();
        } else if ("uncheck" in fld && typeof (fld as { uncheck?: () => void }).uncheck === "function") {
          (fld as { uncheck: () => void }).uncheck();
        }
        continue;
      }
      if ("setText" in fld && typeof (fld as { setText?: (s: string) => void }).setText === "function") {
        (fld as { setText: (s: string) => void }).setText(val);
      }
    }

    form.updateFieldAppearances();

    const rawStory =
      typeof body?.storyText === "string"
        ? body.storyText
        : typeof body?.narrativeText === "string"
          ? body.narrativeText
          : "";
    const sanitizedStory =
      typeof rawStory === "string"
        ? storyInputToPdfPlainText(rawStory.slice(0, MAX_CHARACTER_STORY_PDF_CHARS + 1))
        : "";
    if (sanitizedStory) {
      const ctxRaw = typeof body?.storyContextLine === "string" ? body.storyContextLine.trim() : "";
      const ctx = ctxRaw.slice(0, 400).trim()
        ? storyInputToPdfPlainText(ctxRaw.slice(0, 400)).trim()
        : undefined;
      await appendCharacterStoryToPdf(pdfDoc, sanitizedStory, { contextLine: ctx });
    }

    const out = await pdfDoc.save();
    const outName = sanitizePdfAttachmentFileName(body?.fileName);
    return new Response(Buffer.from(out), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${outName}"`,
      },
    });
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Errore generazione PDF." },
      { status: 500 }
    );
  }
}
