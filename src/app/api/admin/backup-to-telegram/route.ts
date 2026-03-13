import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { uploadToTelegram } from "@/lib/telegram-storage";

type TableConfig = {
  table: string;
  idColumn: string;
};

const DRIVE_HOST_PATTERN = "%drive.google.com%";

function extractDriveFileId(url: string): string | null {
  const pathMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (pathMatch) return pathMatch[1];
  const queryMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
  if (queryMatch) return queryMatch[1];
  return null;
}

export async function POST(_req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Solo admin." }, { status: 403 });
    }

    const admin = createSupabaseAdminClient();

    const tables: TableConfig[] = [
      { table: "campaigns", idColumn: "id" },
      { table: "campaign_characters", idColumn: "id" },
      { table: "wiki_entities", idColumn: "id" },
      { table: "maps", idColumn: "id" },
      { table: "gm_notes", idColumn: "id" },
      { table: "avatars", idColumn: "id" },
    ];

    let backedUp = 0;
    let failed = 0;

    for (const { table, idColumn } of tables) {
      const { data, error } = await admin
        .from(table)
        .select(`${idColumn}, image_url`)
        .is("telegram_fallback_id", null)
        .like("image_url", DRIVE_HOST_PATTERN);

      if (error) {
        console.error("[backup-to-telegram] select error", { table, error });
        continue;
      }
      if (!data || data.length === 0) continue;

      for (const row of data as { [key: string]: unknown }[]) {
        const imageUrl = (row.image_url as string | null) ?? null;
        const recordId = row[idColumn] as string | undefined;
        if (!imageUrl || !recordId) {
          failed += 1;
          continue;
        }

        const fileId = extractDriveFileId(imageUrl);
        if (!fileId) {
          console.error("[backup-to-telegram] drive file id not found", {
            table,
            id: recordId,
            imageUrl,
          });
          failed += 1;
          continue;
        }

        const downloadUrl = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(
          fileId
        )}`;

        try {
          const res = await fetch(downloadUrl);
          if (!res.ok) {
            console.error("[backup-to-telegram] drive download failed", {
              table,
              id: recordId,
              status: res.status,
            });
            failed += 1;
            continue;
          }

          const blob = await res.blob();
          const tgFileId = await uploadToTelegram(blob);

          const { error: updateError } = await admin
            .from(table)
            .update({ telegram_fallback_id: tgFileId } as never)
            .eq(idColumn, recordId);

          if (updateError) {
            console.error("[backup-to-telegram] update error", {
              table,
              id: recordId,
              error: updateError,
            });
            failed += 1;
            continue;
          }

          backedUp += 1;
        } catch (err) {
          console.error("[backup-to-telegram] unexpected per-record error", {
            table,
            id: recordId,
            error: err,
          });
          failed += 1;
        }
      }
    }

    return NextResponse.json({ backedUp, failed });
  } catch (err) {
    console.error("[backup-to-telegram] fatal error", err);
    return NextResponse.json(
      { error: "Errore interno durante il backup." },
      { status: 500 }
    );
  }
}

