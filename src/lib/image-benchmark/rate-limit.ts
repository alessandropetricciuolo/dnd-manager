const WINDOW_MS = 60 * 60 * 1000;
const MAX_RUNS_PER_WINDOW = 20;

type Entry = { count: number; windowStart: number };

const store = new Map<string, Entry>();

export function checkImageBenchmarkRateLimit(userId: string): { ok: true } | { ok: false; message: string } {
  const now = Date.now();
  const entry = store.get(userId);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    store.set(userId, { count: 1, windowStart: now });
    return { ok: true };
  }

  if (entry.count >= MAX_RUNS_PER_WINDOW) {
    return {
      ok: false,
      message: "Limite benchmark raggiunto (20 avvii/ora). Riprova più tardi.",
    };
  }

  entry.count += 1;
  return { ok: true };
}
