import { NextResponse } from "next/server";
import { registerPushDevice, unregisterPushDevice, readPushRequestJson, type PushDeviceDependencies } from "./push-device";

function bearer(req: Request) {
  return req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || null;
}

export function createMobilePushDeviceHandlers(createDependencies: () => PushDeviceDependencies | Promise<PushDeviceDependencies>) {
  async function handle(req: Request, action: "register" | "unregister") {
    const token = bearer(req);
    if (!token) return NextResponse.json({ error: "Accesso richiesto." }, { status: 401 });
    const parsed = await readPushRequestJson(req);
    if (!parsed.ok) return NextResponse.json({ error: parsed.status === 413 ? "Richiesta troppo grande." : "JSON non valido." }, { status: parsed.status });
    try {
      const dependencies = await createDependencies();
      const result = action === "register"
        ? await registerPushDevice(token, parsed.value, dependencies)
        : await unregisterPushDevice(token, parsed.value, dependencies);
      return NextResponse.json(result.body, { status: result.status, headers: { "Cache-Control": "no-store" } });
    } catch {
      return NextResponse.json({ error: action === "register" ? "Registrazione notifiche non disponibile." : "Disattivazione non disponibile." }, { status: 503 });
    }
  }
  return {
    PUT: (req: Request) => handle(req, "register"),
    DELETE: (req: Request) => handle(req, "unregister"),
  };
}
