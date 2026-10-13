import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { dispatchMobilePushes, type PushDispatchDependencies } from "./push-dispatch";

export function createPushDispatchGetHandler(
  getSecret: () => string | undefined,
  createDependencies: () => PushDispatchDependencies | Promise<PushDispatchDependencies>,
  now: () => number = Date.now
) {
  return async function GET(req: Request) {
    const expected = getSecret();
    const given = req.headers.get("authorization") || "";
    const wanted = `Bearer ${expected}`;
    if (!expected || Buffer.byteLength(given) !== Buffer.byteLength(wanted) || !timingSafeEqual(Buffer.from(given), Buffer.from(wanted))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
      const result = await dispatchMobilePushes(await createDependencies(), now());
      return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
    } catch {
      return NextResponse.json({ error: "Invio push non disponibile; la coda conserva i tentativi." }, { status: 503 });
    }
  };
}
