import { NextRequest, NextResponse } from "next/server";
import { saveMobileCharacterState, type MobileCharacterStateDependencies } from "@/lib/mobile-character-state";

const MAX_BODY_BYTES = 16 * 1024;

async function readBoundedJson(req: NextRequest): Promise<{ body?: unknown; tooLarge?: boolean; invalid?: boolean }> {
  const length = Number(req.headers.get("content-length"));
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) return { tooLarge: true };
  if (!req.body) return { invalid: true };
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) { await reader.cancel(); return { tooLarge: true }; }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return { body: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch { return { invalid: true }; }
}

export function createMobileCharacterStatePatchHandler(
  createDependencies: (body: unknown) => Promise<MobileCharacterStateDependencies> | MobileCharacterStateDependencies
) {
  return async function mobileCharacterStatePatch(req: NextRequest, { params }: { params: { id: string } }) {
    const token = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
    if (!token) return NextResponse.json({ error: "auth_required" }, { status: 401 });
    const parsed = await readBoundedJson(req);
    if (parsed.tooLarge) return NextResponse.json({ error: "body_too_large" }, { status: 413 });
    if (parsed.invalid) return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    try {
      const result = await saveMobileCharacterState(params.id, token, parsed.body, await createDependencies(parsed.body));
      return NextResponse.json(result.body, { status: result.status, headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      console.error("[mobile-character-state]", error);
      return NextResponse.json({ error: "save_failed" }, { status: 500 });
    }
  };
}
