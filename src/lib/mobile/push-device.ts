import { pushDeviceSchema } from "./push";

const deleteDeviceSchema = pushDeviceSchema.pick({ token: true }).strict();
export type PushDeviceRecord = ReturnType<typeof pushDeviceSchema.parse>;
export type PushDeviceDependencies = {
  getUser(accessToken: string): Promise<{ id: string } | null>;
  upsertDevice(userId: string, device: PushDeviceRecord): Promise<void>;
  deleteDevice(userId: string, token: string): Promise<void>;
};

export async function registerPushDevice(token: string | null, rawBody: unknown, deps: PushDeviceDependencies) {
  if (!token) return { status: 401, body: { error: "Accesso richiesto." } };
  let user: { id: string } | null;
  try { user = await deps.getUser(token); } catch { return { status: 503, body: { error: "Registrazione notifiche non disponibile." } }; }
  if (!user) return { status: 401, body: { error: "Accesso scaduto." } };
  const parsed = pushDeviceSchema.safeParse(rawBody);
  if (!parsed.success) return { status: 400, body: { error: "Dispositivo non valido." } };
  try {
    await deps.upsertDevice(user.id, parsed.data);
    return { status: 200, body: { ok: true } };
  } catch { return { status: 503, body: { error: "Registrazione notifiche non disponibile." } }; }
}

export async function unregisterPushDevice(token: string | null, rawBody: unknown, deps: PushDeviceDependencies) {
  if (!token) return { status: 401, body: { error: "Accesso richiesto." } };
  let user: { id: string } | null;
  try { user = await deps.getUser(token); } catch { return { status: 503, body: { error: "Disattivazione non disponibile." } }; }
  if (!user) return { status: 401, body: { error: "Accesso scaduto." } };
  const parsed = deleteDeviceSchema.safeParse(rawBody);
  if (!parsed.success) return { status: 400, body: { error: "Token mancante o non valido." } };
  try {
    await deps.deleteDevice(user.id, parsed.data.token);
    return { status: 200, body: { ok: true } };
  } catch { return { status: 503, body: { error: "Disattivazione non disponibile." } }; }
}

export async function readPushRequestJson(req: Request, maxBytes = 16 * 1024): Promise<{ ok: true; value: unknown } | { ok: false; status: 400 | 413 }> {
  const length = Number(req.headers.get("content-length"));
  if (Number.isFinite(length) && length > maxBytes) return { ok: false, status: 413 };
  if (!req.body) return { ok: false, status: 400 };
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); return { ok: false, status: 413 }; }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return { ok: true, value: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch { return { ok: false, status: 400 }; }
}
