import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { DualSourceImage } from "@/components/dual-source-image";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type ProjectedImage = {
  key: string;
  name: string;
  image_url: string | null;
  telegram_fallback_id: string | null;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Proiezione multipla per il secondo schermo: mostra in un'unica finestra
 * tutte le immagini selezionate nella Regia Immagini (?items=id1,id2,...).
 * Gli id sono UUID wiki oppure pg-{uuid} per i personaggi.
 */
export default async function MultiImageProjectionPage({ params, searchParams }: PageProps) {
  const { id: campaignId } = await params;
  const sp = (await searchParams) ?? {};
  const itemsRaw = typeof sp.items === "string" ? sp.items : Array.isArray(sp.items) ? sp.items[0] : "";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/dashboard");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isGmOrAdmin = profile?.role === "gm" || profile?.role === "admin";
  if (!isGmOrAdmin) notFound();

  const orderedIds = (itemsRaw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => UUID_REGEX.test(s) || (s.startsWith("pg-") && UUID_REGEX.test(s.slice(3))));

  const wikiIds = orderedIds.filter((s) => !s.startsWith("pg-"));
  const characterIds = orderedIds.filter((s) => s.startsWith("pg-")).map((s) => s.slice(3));

  const [wikiRes, charRes] = await Promise.all([
    wikiIds.length > 0
      ? supabase
          .from("wiki_entities")
          .select("id, name, image_url, telegram_fallback_id")
          .eq("campaign_id", campaignId)
          .in("id", wikiIds)
      : Promise.resolve({ data: [] }),
    characterIds.length > 0
      ? supabase
          .from("campaign_characters")
          .select("id, name, image_url")
          .eq("campaign_id", campaignId)
          .in("id", characterIds)
      : Promise.resolve({ data: [] }),
  ]);

  const wikiById = new Map(
    ((wikiRes.data ?? []) as { id: string; name: string; image_url: string | null; telegram_fallback_id: string | null }[]).map(
      (r) => [r.id, r]
    )
  );
  const charById = new Map(
    ((charRes.data ?? []) as { id: string; name: string; image_url: string | null }[]).map((r) => [r.id, r])
  );

  // Mantiene l'ordine di selezione della regia.
  const images: ProjectedImage[] = [];
  for (const rawId of orderedIds) {
    if (rawId.startsWith("pg-")) {
      const row = charById.get(rawId.slice(3));
      if (row && row.image_url) {
        images.push({ key: rawId, name: row.name, image_url: row.image_url, telegram_fallback_id: null });
      }
    } else {
      const row = wikiById.get(rawId);
      if (row && (row.image_url || row.telegram_fallback_id)) {
        images.push({
          key: rawId,
          name: row.name,
          image_url: row.image_url,
          telegram_fallback_id: row.telegram_fallback_id,
        });
      }
    }
  }

  if (images.length === 0) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-black">
        <p className="text-sm text-zinc-500">Nessuna immagine da proiettare.</p>
      </div>
    );
  }

  const cols = Math.ceil(Math.sqrt(images.length));
  const rows = Math.ceil(images.length / cols);

  return (
    <div
      className="grid h-dvh w-screen gap-1 bg-black p-1"
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
      }}
    >
      {images.map((img) => (
        <figure key={img.key} className="relative flex min-h-0 min-w-0 items-center justify-center overflow-hidden">
          <DualSourceImage
            driveUrl={img.image_url ?? undefined}
            telegramFallbackId={img.telegram_fallback_id ?? undefined}
            alt={img.name}
            className="max-h-full max-w-full object-contain"
          />
          <figcaption className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded bg-black/70 px-2 py-0.5 text-xs font-medium text-amber-100">
            {img.name}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
