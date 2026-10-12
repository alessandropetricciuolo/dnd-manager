import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import {
  readSessionXpDraft,
  writeSessionXpDraft,
} from "@/lib/gm/session-xp-draft-server";

async function actor(req: NextRequest) {
  const bearer = req.headers.get("authorization");
  const client = bearer
    ? createSupabaseAdminClient()
    : await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = bearer
    ? await client.auth.getUser(bearer.replace(/^Bearer /i, ""))
    : await client.auth.getUser();
  if (error || !user) throw new Error("auth");
  return user.id;
}
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    return NextResponse.json(
      await readSessionXpDraft(await actor(req), params.id),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore";
    return NextResponse.json(
      { error: message },
      { status: message === "auth" ? 401 : 403 },
    );
  }
}
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const actorId = await actor(req);
    const body = await req.json();
    if (
      !Number.isSafeInteger(body.expectedRevision) ||
      body.expectedRevision < 0
    )
      throw new Error("Revisione non valida.");
    return NextResponse.json(
      await writeSessionXpDraft(
        actorId,
        params.id,
        body.draft,
        body.expectedRevision,
      ),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore";
    return NextResponse.json(
      { error: message },
      {
        status:
          message === "auth"
            ? 401
            : message.includes("dispositivo")
              ? 409
              : 400,
      },
    );
  }
}
