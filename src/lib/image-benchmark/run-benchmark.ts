import { uploadToTelegram } from "@/lib/telegram-storage";
import type { Json } from "@/types/database.types";
import type { RunBenchmarkInput } from "./types";
import { BENCHMARK_CONCURRENCY } from "./models";
import { getImageGenerationProvider } from "./providers";
import type { createSupabaseAdminClient } from "@/utils/supabase/admin";

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

function dataUrlToBlob(dataUrl: string): Blob | null {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  const [, mime, b64] = match;
  try {
    const binary = Buffer.from(b64, "base64");
    return new Blob([binary], { type: mime });
  } catch {
    return null;
  }
}

async function persistImageOutput(
  imageUrl?: string,
  imageBase64?: string
): Promise<{ imageUrl: string | null; imageBase64: string | null }> {
  const dataUrl = imageBase64 ?? (imageUrl?.startsWith("data:image") ? imageUrl : undefined);

  if (dataUrl) {
    try {
      const blob = dataUrlToBlob(dataUrl);
      if (blob) {
        const fileId = await uploadToTelegram(blob, "image-benchmark");
        return { imageUrl: `/api/tg-image/${fileId}`, imageBase64: null };
      }
    } catch (error) {
      console.warn("[image-benchmark] Telegram upload fallito, salvo data URL nel DB:", error);
    }
    return { imageUrl: null, imageBase64: dataUrl };
  }

  if (imageUrl) {
    return { imageUrl, imageBase64: null };
  }

  return { imageUrl: null, imageBase64: null };
}

async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit: number
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < tasks.length) {
      const current = nextIndex++;
      try {
        const value = await tasks[current]();
        results[current] = { status: "fulfilled", value };
      } catch (reason) {
        results[current] = { status: "rejected", reason };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, () => worker()));
  return results;
}

export async function runBenchmarkPromptAgainstModels(
  admin: AdminClient,
  input: RunBenchmarkInput
): Promise<{ ok: true; resultIds: string[] } | { ok: false; message: string }> {
  const provider = getImageGenerationProvider("openrouter");
  const pendingRows: { id: string; model: string }[] = [];

  for (const model of input.models) {
    const { data, error } = await admin
      .from("image_benchmark_results")
      .insert({
        run_id: input.runId,
        prompt_id: input.promptId,
        provider: "openrouter",
        model,
        prompt: input.prompt,
        aspect_ratio: input.aspectRatio,
        status: "pending",
      } as never)
      .select("id, model")
      .single();

    if (error || !data) {
      console.error("[image-benchmark] insert pending failed", model, error);
      continue;
    }

    pendingRows.push({ id: String((data as { id: string }).id), model });
  }

  if (pendingRows.length === 0) {
    return { ok: false, message: "Impossibile creare risultati pending." };
  }

  const tasks = pendingRows.map(({ id, model }) => async () => {
    const generated = await provider.generateImage({
      model,
      prompt: input.prompt,
      aspectRatio: input.aspectRatio,
    });

    if (!generated.success) {
      await admin
        .from("image_benchmark_results")
        .update({
          status: "error",
          error_message: generated.errorMessage ?? "Errore generazione",
          raw_response: generated.rawResponse as Json,
          duration_ms: generated.durationMs,
        } as never)
        .eq("id", id);
      return id;
    }

    const stored = await persistImageOutput(generated.imageUrl, generated.imageBase64);

    await admin
      .from("image_benchmark_results")
      .update({
        status: "success",
        image_url: stored.imageUrl,
        image_base64: stored.imageBase64,
        raw_response: generated.rawResponse as Json,
        duration_ms: generated.durationMs,
        estimated_cost_usd: generated.estimatedCostUsd ?? null,
        error_message: null,
      } as never)
      .eq("id", id);

    return id;
  });

  await runWithConcurrency(tasks, BENCHMARK_CONCURRENCY);

  return { ok: true, resultIds: pendingRows.map((r) => r.id) };
}
