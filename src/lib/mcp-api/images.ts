import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { isIP } from "node:net";
import type { McpAuthContext } from "./auth";
import { ApiError } from "./contracts";
import { normalizeImageUrl } from "@/lib/image-url";

const MAX_BYTES = 3 * 1024 * 1024;
type Image = { type: "image"; data: string; mimeType: string };
export type ImageFetcher = (url: string) => Promise<Buffer>;

export function imageBlock(bytes: Buffer): Image {
  if (!bytes.length || bytes.length > MAX_BYTES) throw new Error("Image exceeds the 3 MiB limit");
  const mimeType = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? "image/png" :
    bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? "image/jpeg" :
    bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP" ? "image/webp" : null;
  if (!mimeType) throw new Error("Unsupported image: PNG, JPEG or WebP required");
  return { type: "image", mimeType, data: bytes.toString("base64") };
}

export function isPublicAddress(address: string): boolean {
  if (isIP(address) === 6) return /^2[0-9a-f]{3}:/i.test(address) && !/^2001:(?:db8|0):/i.test(address);
  if (isIP(address) !== 4) return false;
  const [a, b] = address.split(".").map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0)) || (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19)));
}

async function boundedResponse(response: Response): Promise<Buffer> {
  if (!response.ok || !response.body) throw new Error("Image download failed");
  const reader = response.body.getReader();
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_BYTES) throw new Error("Image exceeds the 3 MiB limit");
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  return Buffer.concat(chunks);
}

export async function fetchSiteImage(source: string): Promise<Buffer> {
  const signal = AbortSignal.timeout(12000);
  const tg = source.trim().match(/^\/api\/tg-image\/([^/?#]+)$/);
  if (tg) {
    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
    if (!token) throw new Error("Image storage unavailable");
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(decodeURIComponent(tg[1]))}`, { signal, redirect: "error" });
      if (!response.ok) throw new Error();
      const info = await response.json();
      const path = info.result?.file_path;
      if (!info.ok || typeof path !== "string" || !/^[a-zA-Z0-9_./-]+$/.test(path) || path.includes("..")) throw new Error();
      return await boundedResponse(await fetch(`https://api.telegram.org/file/bot${token}/${path}`, { signal, redirect: "error" }));
    } catch { throw new Error("Image storage download failed"); }
  }
  let url = new URL(normalizeImageUrl(source));
  for (let redirects = 0; redirects <= 3; redirects++) {
    if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) throw new Error("Unsafe image URL");
    const addresses = await lookup(url.hostname, { all: true });
    if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) throw new Error("Unsafe image host");
    // Pin the validated DNS address to the connection, preserving TLS hostname checks.
    const response = await new Promise<Response>((resolve, reject) => {
      const pinned = addresses[0];
      const req = request(url, { signal, lookup: (_host, options, callback) => {
        if ((options as { all?: boolean }).all) (callback as (...args: unknown[]) => void)(null, [pinned]);
        else callback(null, pinned.address, pinned.family);
      } }, (res) => {
        const status = res.statusCode ?? 502;
        if ([301, 302, 303, 307, 308].includes(status)) {
          res.resume();
          resolve(new Response(null, { status, headers: res.headers.location ? { location: res.headers.location } : {} }));
          return;
        }
        if (status !== 200) { res.resume(); reject(new Error("Image download failed")); return; }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_BYTES) { res.destroy(new Error("Image exceeds the 3 MiB limit")); return; }
          chunks.push(chunk);
        });
        res.on("error", reject);
        res.on("end", () => resolve(new Response(new Uint8Array(Buffer.concat(chunks)))));
      });
      req.on("error", reject);
      req.end();
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel();
      const location = response.headers.get("location");
      if (!location) throw new Error("Invalid image redirect");
      url = new URL(location, url);
      continue;
    }
    return boundedResponse(response);
  }
  throw new Error("Too many image redirects");
}

export async function readSiteImages(auth: McpAuthContext, operation: string, args: Record<string, any>, read: (request: unknown) => Promise<any>, fetchImage: ImageFetcher = fetchSiteImage) {
  // Authorize the parent before fetching any bytes or reading its attachments.
  const isMap = operation === "read_map_image";
  const result = await read({ operation: isMap ? "get_map" : "get_entity", args: { campaign_id: args.campaign_id, ...(isMap ? { map_id: args.map_id } : { entity_id: args.entity_id }), ...(args.admin_only !== undefined ? { admin_only: args.admin_only } : {}) } });
  const parent = isMap ? result.map : result.entity;
  const sources: { kind: string; url: string | null; asset_id?: string }[] = [];
  if (parent.image_url) sources.push({ kind: "primary", url: parent.image_url });
  if (!isMap && result.assets.length) {
    const ids = result.assets.map((asset: { asset_id: string }) => asset.asset_id);
    const { data, error } = await auth.db.from("mcp_assets").select("id,mime_type").eq("campaign_id", args.campaign_id).in("id", ids);
    if (error) throw new ApiError(503, "Image attachment lookup failed");
    for (const asset of [...(data ?? [])].sort((a, b) => a.id.localeCompare(b.id))) {
      if (["image/png", "image/jpeg", "image/webp"].includes(asset.mime_type)) sources.push({ kind: "attachment", asset_id: asset.id, url: null });
    }
  }
  const offset = args.offset ?? 0, limit = args.limit ?? 1;
  const images: Image[] = [];
  let totalBytes = 0;
  const references: Record<string, unknown>[] = [];
  for (const source of sources.slice(offset, offset + limit)) {
    try {
      let bytes: Buffer;
      if (source.asset_id) {
        const { data, error } = await auth.db.from("mcp_assets").select("data_base64").eq("campaign_id", args.campaign_id).eq("id", source.asset_id).maybeSingle();
        if (error || !data) throw new Error();
        bytes = Buffer.from(data.data_base64, "base64");
      } else bytes = await fetchImage(source.url!);
      if (totalBytes + bytes.length > MAX_BYTES) throw new Error("Image response exceeds the 3 MiB limit");
      const image = imageBlock(bytes);
      totalBytes += bytes.length;
      images.push(image);
      references.push({ ...source, image_index: images.length - 1, status: "available" });
    } catch {
      references.push({ ...source, status: "unavailable", reason: "Image could not be read (unsupported, oversized or inaccessible)" });
    }
  }
  return { source: { id: parent.id, name: parent.name, domain: isMap ? "atlas" : "wiki" }, body: parent.body ?? parent.description ?? "", references, total: sources.length, offset, next_offset: offset + limit < sources.length ? offset + limit : null, images };
}

export function imageToolResult(result: Awaited<ReturnType<typeof readSiteImages>>) {
  const { images, ...metadata } = result;
  return { content: [{ type: "text" as const, text: JSON.stringify(metadata) }, ...images], structuredContent: metadata, ...(referencesFailed(metadata.references) ? { isError: true } : {}) };
}
function referencesFailed(references: Record<string, unknown>[]) {
  return references.length > 0 && references.every((reference) => reference.status === "unavailable");
}
