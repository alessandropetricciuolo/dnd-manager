import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { PHB_MD_FILE } from "@/lib/character-build-catalog";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function readFromDisk(): string | null {
  const candidates = [
    path.join(process.cwd(), "public", "manuals", PHB_MD_FILE),
    path.join(process.cwd(), "dnd-manager", "public", "manuals", PHB_MD_FILE),
  ];
  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    try {
      return fs.readFileSync(p, "utf-8");
    } catch {
      /* prova prossimo */
    }
  }
  return null;
}

/**
 * Serve il markdown del Manuale del Giocatore per uso server-side (snapshot incantesimi).
 * Prima prova filesystem; se assente (alcuni deploy), fa proxy alla copia statica in /public.
 */
export async function GET(request: Request) {
  const fromDisk = readFromDisk();
  if (fromDisk && fromDisk.length > 5000) {
    return new NextResponse(fromDisk, {
      headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, max-age=3600" },
    });
  }

  try {
    const base = new URL(request.url);
    const staticUrl = new URL(`/manuals/${encodeURI(PHB_MD_FILE)}`, `${base.protocol}//${base.host}`);
    const res = await fetch(staticUrl.toString(), { cache: "no-store" });
    if (res.ok) {
      const t = await res.text();
      if (t.length > 5000) {
        return new NextResponse(t, {
          headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, max-age=3600" },
        });
      }
    }
  } catch {
    /* fallthrough */
  }

  return new NextResponse("Manuale non disponibile sul server.", { status: 404 });
}
