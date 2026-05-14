/**
 * Protocollo comandi telecomando GM (v1 estensibile).
 * Campi envelope: type, payload, command_id, issued_at, seq?, source?
 */

export type GmRemoteCommandSource = "remote" | "gm_screen";

export type GmRemoteCommandEnvelopeV1 = {
  command_id: string;
  type: string;
  payload: Record<string, unknown>;
  issued_at: string;
  seq?: number | null;
  source?: GmRemoteCommandSource;
};

/** Tipi audio MVP (estendere con nuovi prefissi dominio). */
export const GM_REMOTE_AUDIO_TYPES = [
  "audio.music_play_pause",
  "audio.music_next",
  "audio.music_prev",
  "audio.music_select_track",
  "audio.music_master_volume",
  "audio.music_mute",
  "audio.atmos_master_volume",
  "audio.sfx_master_volume",
  "audio.sfx_pad_slot",
  "audio.sfx_category_random",
  "audio.spotify_select_playlist",
  "audio.stop_all",
] as const;

export type GmRemoteAudioCommandType = (typeof GM_REMOTE_AUDIO_TYPES)[number];

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export type ParsedRemotePost = {
  token: string;
  envelope: GmRemoteCommandEnvelopeV1;
};

export function parseRemotePostBody(raw: unknown):
  | { ok: true; data: ParsedRemotePost }
  | { ok: false; error: string } {
  if (!isRecord(raw)) return { ok: false, error: "invalid_json" };
  const token = typeof raw.token === "string" ? raw.token.trim() : "";
  if (token.length < 16) return { ok: false, error: "invalid_token" };
  const command_id = typeof raw.command_id === "string" ? raw.command_id.trim() : "";
  if (!isUuid(command_id)) return { ok: false, error: "invalid_command_id" };
  const type = typeof raw.type === "string" ? raw.type.trim() : "";
  if (!type || type.length > 120) return { ok: false, error: "invalid_type" };
  const issued_at = typeof raw.issued_at === "string" ? raw.issued_at.trim() : "";
  if (!issued_at || Number.isNaN(Date.parse(issued_at))) return { ok: false, error: "invalid_issued_at" };
  const payload = isRecord(raw.payload) ? raw.payload : {};
  const seqRaw = raw.seq;
  const seq =
    typeof seqRaw === "number" && Number.isFinite(seqRaw)
      ? Math.floor(seqRaw)
      : seqRaw === null
        ? null
        : undefined;
  const src = raw.source;
  const source: GmRemoteCommandSource = src === "gm_screen" ? "gm_screen" : "remote";
  return {
    ok: true,
    data: {
      token,
      envelope: { command_id, type, payload, issued_at, seq: seq ?? undefined, source },
    },
  };
}

export type GmRemoteCommandRow = {
  command_id: string;
  type: string;
  payload: Record<string, unknown>;
  issued_at: string;
  seq: number | null;
  source: string;
};
