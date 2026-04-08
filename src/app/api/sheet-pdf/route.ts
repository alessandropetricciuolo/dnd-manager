import fs from "fs";
import path from "path";
import { PDFDocument } from "pdf-lib";

function resolveTemplatePath(): string | null {
  const envPath = process.env.SHEET_BASE_PDF_PATH?.trim();
  const candidates = [
    envPath || "",
    path.join(process.cwd(), "public", "Scheda_Base.pdf"),
    path.join(process.cwd(), "Scheda_Base.pdf"),
    path.join(process.cwd(), "..", "Scheda_Base.pdf"),
  ].filter(Boolean);
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function valueToString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v);
}

export async function POST(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as { fields?: Record<string, unknown>; fileName?: string };
    const fields = body?.fields ?? {};
    const templatePath = resolveTemplatePath();
    if (!templatePath) {
      return Response.json(
        {
          success: false,
          error: "Template PDF non trovato. Aggiungi `Scheda_Base.pdf` in `public/` o configura `SHEET_BASE_PDF_PATH`.",
        },
        { status: 404 }
      );
    }

    const templateBytes = fs.readFileSync(templatePath);
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
        if (val.trim().toLowerCase() === "x" || val.trim().toLowerCase() === "true") {
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
    const out = await pdfDoc.save();
    const outName = (body?.fileName?.trim() || "scheda-compilata.pdf").replace(/[^\w.\- ]+/g, "_");
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
