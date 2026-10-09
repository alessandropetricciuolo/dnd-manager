import { getWikiImages, parseWikiImageKey } from "@/lib/wiki/images";
import { getWikiVideos, parseWikiVideoKey } from "@/lib/wiki/videos";
import { ProjectedVideo } from "@/components/gm/projected-video";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { DualSourceImage } from "@/components/dual-source-image";
import { ProjectionPresence } from "@/components/gm/projection-presence";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type ProjectedImage = {
  key: string;
  name: string;
  image_url: string | null;
  telegram_fallback_id: string | null;
  video_url?: string;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Proiezione multipla per il secondo schermo: mostra in un'unica finestra
 * tutte le immagini selezionate nella Regia Immagini (?items=id1,id2,...).
 * Gli id sono UUID wiki oppure pg-{uuid} per i personaggi.
 */
export default async function MultiImageProjectionPage({
  params,
  searchParams,
}: PageProps) {
  const { id: campaignId } = await params;
  const sp = (await searchParams) ?? {};
  const itemsRaw =
    typeof sp.items === "string"
      ? sp.items
      : Array.isArray(sp.items)
        ? sp.items[0]
        : "";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/dashboard");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isGmOrAdmin = profile?.role === "gm" || profile?.role === "admin";
  if (!isGmOrAdmin) notFound();

  const orderedIds = (itemsRaw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(
      (s) =>
        parseWikiImageKey(s) !== null ||
        parseWikiVideoKey(s) !== null ||
        (s.startsWith("pg-") && UUID_REGEX.test(s.slice(3))),
    );

  const wikiIds = [...new Set(orderedIds.filter((s) => !s.startsWith("pg-")).map(s => (parseWikiImageKey(s) ?? parseWikiVideoKey(s))!.entityId))];
  const characterIds = orderedIds
    .filter((s) => s.startsWith("pg-"))
    .map((s) => s.slice(3));

  let wikiQuery =
    wikiIds.length > 0
      ? supabase
          .from("wiki_entities")
          .select("id, name, image_url, attributes, telegram_fallback_id")
          .eq("campaign_id", campaignId)
          .in("id", wikiIds)
      : null;
  if (wikiQuery && profile?.role !== "admin")
    wikiQuery = wikiQuery.eq("admin_only", false);
  const [wikiRes, charRes] = await Promise.all([
    wikiQuery ?? Promise.resolve({ data: [] }),
    characterIds.length > 0
      ? supabase
          .from("campaign_characters")
          .select("id, name, image_url")
          .eq("campaign_id", campaignId)
          .in("id", characterIds)
      : Promise.resolve({ data: [] }),
  ]);

  const wikiById = new Map(
    (
      (wikiRes.data ?? []) as {
        id: string;
        name: string;
        image_url: string | null;
        telegram_fallback_id: string | null;
        attributes: Record<string, unknown> | null;
      }[]
    ).map((r) => [r.id, r]),
  );
  const charById = new Map(
    (
      (charRes.data ?? []) as {
        id: string;
        name: string;
        image_url: string | null;
      }[]
    ).map((r) => [r.id, r]),
  );

  // Mantiene l'ordine di selezione della regia.
  const images: ProjectedImage[] = [];
  for (const rawId of orderedIds) {
    if (rawId.startsWith("pg-")) {
      const row = charById.get(rawId.slice(3));
      if (row && row.image_url) {
        images.push({
          key: rawId,
          name: row.name,
          image_url: row.image_url,
          telegram_fallback_id: null,
        });
      }
    } else if (parseWikiVideoKey(rawId)) {
      const parsed = parseWikiVideoKey(rawId)!;
      const row = wikiById.get(parsed.entityId);
      const video = getWikiVideos(row?.attributes).find(video => video.id === parsed.videoId);
      if (row && video) {
        images.push({ key: rawId, name: `${row.name} · ${video.title}`, image_url: null, telegram_fallback_id: null, video_url: video.url });
      }
    } else {
      const parsed = parseWikiImageKey(rawId)!;
      const row = wikiById.get(parsed.entityId);
      const extraImage = parsed.imageId ? getWikiImages(row?.attributes).find(image => image.id === parsed.imageId) : null;
      if (row && (parsed.imageId ? extraImage : row.image_url || row.telegram_fallback_id)) {
        images.push({
          key: rawId,
          name: extraImage?.title ? `${row.name} · ${extraImage.title}` : row.name,
          image_url: extraImage?.url ?? row.image_url,
          telegram_fallback_id: extraImage ? extraImage.telegram_fallback_id ?? null : row.telegram_fallback_id,
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
    <>
      <ProjectionPresence
        campaignId={campaignId}
        itemIds={images.map((image) => image.key)}
      />
      <div
        className="grid h-dvh w-screen gap-1 bg-black p-1"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        }}
      >
        {images.map((img) => (
          <figure
            key={img.key}
            className="relative flex min-h-0 min-w-0 items-center justify-center overflow-hidden"
          >
            {img.video_url ? <ProjectedVideo src={img.video_url} title={img.name} /> : <DualSourceImage
              driveUrl={img.image_url ?? undefined}
              telegramFallbackId={img.telegram_fallback_id ?? undefined}
              alt={img.name}
              preserveOriginal
              className="max-h-full max-w-full object-contain"
            />}
            {!img.video_url && <figcaption className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded bg-black/70 px-2 py-0.5 text-xs font-medium text-amber-100">
              {img.name}
            </figcaption>}
          </figure>
        ))}
      </div>
    </>
  );
}
