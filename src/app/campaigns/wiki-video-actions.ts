"use server";

import { createHmac, timingSafeEqual } from "node:crypto";
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { buildR2PublicObjectUrl, getR2Config, getR2S3Client } from "@/lib/r2/config";
import { getWikiVideos, MAX_WIKI_VIDEOS, validateWikiVideoFile, type WikiVideo } from "@/lib/wiki/videos";

type Ticket = { userId: string; campaignId: string; entityId: string; id: string; key: string; size: number; expires: number };
function signature(body: string) { return createHmac("sha256", getR2Config().secretAccessKey).update(body).digest("base64url"); }
function encodeTicket(ticket: Ticket) { const body = Buffer.from(JSON.stringify(ticket)).toString("base64url"); return `${body}.${signature(body)}`; }
function decodeTicket(token: string, allowExpired = false): Ticket {
  const [body, sig, extra] = token.split(".");
  if (!body || !sig || extra || sig.length !== signature(body).length || !timingSafeEqual(Buffer.from(sig), Buffer.from(signature(body)))) throw new Error("Caricamento non valido. Seleziona nuovamente il video.");
  const ticket = JSON.parse(Buffer.from(body, "base64url").toString()) as Ticket;
  if (!allowExpired && ticket.expires < Date.now()) throw new Error("Caricamento scaduto. Annulla e seleziona nuovamente il video.");
  return ticket;
}

async function editableEntity(campaignId: string, entityId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non autenticato.");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "gm" && profile?.role !== "admin") throw new Error("Solo GM e Admin possono gestire i video.");
  // Use the authenticated client: campaign and entity visibility remain subject to RLS.
  const { data: entity, error } = await supabase.from("wiki_entities").select("id, attributes, updated_at, admin_only, is_secret, visibility").eq("id", entityId).eq("campaign_id", campaignId).maybeSingle();
  if (error || !entity) throw new Error("Voce Wiki non accessibile.");
  if (entity.admin_only && profile.role !== "admin") throw new Error("Voce Wiki non accessibile.");
  return { supabase, user, entity };
}

function refresh(campaignId: string, entityId: string) {
  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath(`/campaigns/${campaignId}/wiki/${entityId}`);
}
function failure(error: unknown) { return { success: false as const, message: error instanceof Error ? error.message : "Operazione video non riuscita." }; }

async function checkBucketSpace(additionalBytes: number) {
  let used = 0;
  let continuation: string | undefined;
  do {
    const page = await getR2S3Client().send(new ListObjectsV2Command({ Bucket: getR2Config().bucket, ContinuationToken: continuation }));
    used += (page.Contents ?? []).reduce((sum, object) => sum + (object.Size ?? 0), 0);
    continuation = page.NextContinuationToken;
  } while (continuation);
  // Application guard for this bucket; the provider's free quota is account-wide.
  if (used + additionalBytes > 10_000_000_000) throw new Error("Il bucket raggiungerebbe 10 GB. Prima di caricare altri video va valutato lo spazio disponibile.");
}

export async function prepareWikiVideoUpload(campaignId: string, entityId: string, size: number, mime: string) {
  try {
    const invalid = validateWikiVideoFile(size, mime);
    if (invalid) throw new Error(invalid);
    const { user, entity } = await editableEntity(campaignId, entityId);
    if (getWikiVideos(entity.attributes).length >= MAX_WIKI_VIDEOS) throw new Error("Massimo 20 video per voce Wiki.");
    await checkBucketSpace(size);
    const id = crypto.randomUUID();
    const key = `wiki-videos/${campaignId}/${entityId}/${id}.mp4`;
    const { bucket } = getR2Config();
    const uploadUrl = await getSignedUrl(getR2S3Client(), new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: "video/mp4" }), { expiresIn: 600 });
    const ticket = encodeTicket({ userId: user.id, campaignId, entityId, id, key, size, expires: Date.now() + 60 * 60 * 1000 });
    return { success: true as const, uploadUrl, ticket };
  } catch (error) { return failure(error); }
}

export async function saveWikiVideo(token: string, title: string) {
  try {
    const ticket = decodeTicket(token);
    const { supabase, user, entity } = await editableEntity(ticket.campaignId, ticket.entityId);
    if (user.id !== ticket.userId) throw new Error("Caricamento non autorizzato.");
    const videos = getWikiVideos(entity.attributes);
    if (videos.some(video => video.id === ticket.id)) return { success: true as const, videos };
    if (videos.length >= MAX_WIKI_VIDEOS) throw new Error("Massimo 20 video per voce Wiki.");
    const { bucket } = getR2Config();
    const client = getR2S3Client();
    const object = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: ticket.key }));
    if (object.ContentLength !== ticket.size || validateWikiVideoFile(object.ContentLength ?? 0, object.ContentType ?? "")) throw new Error("Il file caricato non corrisponde al video selezionato.");
    const header = await client.send(new GetObjectCommand({ Bucket: bucket, Key: ticket.key, Range: "bytes=0-31" }));
    const bytes = await header.Body?.transformToByteArray();
    if (!bytes || Buffer.from(bytes).subarray(4, 8).toString() !== "ftyp") throw new Error("Il file non è un contenitore MP4 valido.");
    const video: WikiVideo = { id: ticket.id, url: buildR2PublicObjectUrl(ticket.key), title: title.trim().slice(0, 200) || "Video ambientale", storage_key: ticket.key, file_size_bytes: ticket.size };
    const next = [...videos, video];
    const { data, error } = await supabase.from("wiki_entities").update({ attributes: { ...entity.attributes, videos: next } }).eq("id", ticket.entityId).eq("campaign_id", ticket.campaignId).eq("updated_at", entity.updated_at).select("id").maybeSingle();
    if (error) throw new Error("Impossibile salvare il video nella Wiki.");
    if (!data) throw new Error("La voce è stata modificata. Premi nuovamente Salva video.");
    const { data: saved } = await supabase.from("wiki_entities").select("attributes").eq("id", ticket.entityId).eq("campaign_id", ticket.campaignId).single();
    const persisted = getWikiVideos(saved?.attributes);
    if (!persisted.some(row => row.id === ticket.id)) throw new Error("Salvataggio non verificato. Premi nuovamente Salva video.");
    refresh(ticket.campaignId, ticket.entityId);
    return { success: true as const, videos: persisted };
  } catch (error) { return failure(error); }
}

export async function discardWikiVideoUpload(token: string) {
  try {
    const ticket = decodeTicket(token, true);
    const { user, entity } = await editableEntity(ticket.campaignId, ticket.entityId);
    if (user.id !== ticket.userId) throw new Error("Caricamento non autorizzato.");
    if (getWikiVideos(entity.attributes).some(video => video.id === ticket.id)) throw new Error("Il video è già salvato nella Wiki.");
    await getR2S3Client().send(new DeleteObjectCommand({ Bucket: getR2Config().bucket, Key: ticket.key }));
    return { success: true as const };
  } catch (error) { return failure(error); }
}

export async function removeWikiVideo(campaignId: string, entityId: string, videoId: string) {
  try {
    const { supabase, entity } = await editableEntity(campaignId, entityId);
    const videos = getWikiVideos(entity.attributes);
    const video = videos.find(row => row.id === videoId);
    if (!video) throw new Error("Video non trovato.");
    // Only delete objects in this entity's namespace, never audio or another entity's files.
    if (video.storage_key !== `wiki-videos/${campaignId}/${entityId}/${videoId}.mp4`) throw new Error("Percorso video non valido.");
    const next = videos.filter(row => row.id !== videoId);
    const { data, error } = await supabase.from("wiki_entities").update({ attributes: { ...entity.attributes, videos: next } }).eq("id", entityId).eq("campaign_id", campaignId).eq("updated_at", entity.updated_at).select("id").maybeSingle();
    if (error || !data) throw new Error("Rimozione non riuscita. Aggiorna la pagina e riprova.");
    let message = "Video rimosso.";
    try { await getR2S3Client().send(new DeleteObjectCommand({ Bucket: getR2Config().bucket, Key: video.storage_key })); }
    catch { message = "Video rimosso dalla Wiki; eliminazione del file dallo storage non riuscita."; }
    refresh(campaignId, entityId);
    return { success: true as const, videos: next, message };
  } catch (error) { return failure(error); }
}
