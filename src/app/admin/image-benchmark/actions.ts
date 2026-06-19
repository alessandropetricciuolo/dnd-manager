"use server";

import { revalidatePath } from "next/cache";
import { ensureImageBenchmarkAdmin } from "@/lib/image-benchmark/access";
import {
  IMAGE_BENCHMARK_ASPECT_RATIOS,
  MAX_PROMPTS_PER_RUN,
  OPENROUTER_IMAGE_BENCHMARK_MODELS,
} from "@/lib/image-benchmark/models";
import { getSiteImageModel } from "@/lib/ai/openrouter-image-preview";
import { checkImageBenchmarkRateLimit } from "@/lib/image-benchmark/rate-limit";
import { resolveBenchmarkCampaign, buildBenchmarkImagePrompt } from "@/lib/image-benchmark/build-prompt";
import { runBenchmarkPromptAgainstModels } from "@/lib/image-benchmark/run-benchmark";
import type { BenchmarkScoreInput } from "@/lib/image-benchmark/types";
import { averageScore } from "@/lib/image-benchmark/types";

export type CreateBenchmarkRunInput = {
  title: string;
  description?: string;
  prompts: Array<{ category: string; prompt: string; aspectRatio: string }>;
};

function benchmarkModels(): string[] {
  return [getSiteImageModel()];
}

export async function listImageBenchmarkRunsAction() {
  const access = await ensureImageBenchmarkAdmin();
  if (!access.ok) return { success: false as const, message: access.message };

  const { data, error } = await access.admin
    .from("image_benchmark_runs")
    .select("id, title, description, created_at")
    .order("created_at", { ascending: false });

  if (error) return { success: false as const, message: error.message };
  return { success: true as const, runs: data ?? [] };
}

export async function getImageBenchmarkRunAction(runId: string) {
  const access = await ensureImageBenchmarkAdmin();
  if (!access.ok) return { success: false as const, message: access.message };

  const { data: run, error: runError } = await access.admin
    .from("image_benchmark_runs")
    .select("*")
    .eq("id", runId)
    .single();

  if (runError || !run) {
    return { success: false as const, message: runError?.message ?? "Run non trovata." };
  }

  const { data: prompts } = await access.admin
    .from("image_benchmark_prompts")
    .select("*")
    .eq("run_id", runId)
    .order("sort_order", { ascending: true });

  const { data: results } = await access.admin
    .from("image_benchmark_results")
    .select("*")
    .eq("run_id", runId)
    .order("created_at", { ascending: true });

  const resultIds = (results ?? []).map((r) => (r as { id: string }).id);
  let scores: unknown[] = [];
  if (resultIds.length > 0) {
    const { data: scoreRows } = await access.admin
      .from("image_benchmark_scores")
      .select("*")
      .in("result_id", resultIds);
    scores = scoreRows ?? [];
  }

  return {
    success: true as const,
    run,
    prompts: prompts ?? [],
    results: results ?? [],
    scores: scores ?? [],
    models: [...OPENROUTER_IMAGE_BENCHMARK_MODELS],
    aspectRatios: [...IMAGE_BENCHMARK_ASPECT_RATIOS],
    campaign: await resolveBenchmarkCampaign(access.admin),
  };
}

export async function createImageBenchmarkRunAction(input: CreateBenchmarkRunInput) {
  const access = await ensureImageBenchmarkAdmin();
  if (!access.ok) return { success: false as const, message: access.message };

  const rate = checkImageBenchmarkRateLimit(access.userId);
  if (!rate.ok) return { success: false as const, message: rate.message };

  const title = input.title.trim();
  if (!title) return { success: false as const, message: "Il titolo è obbligatorio." };

  const prompts = input.prompts.filter((p) => p.prompt.trim());
  if (prompts.length === 0) {
    return { success: false as const, message: "Aggiungi almeno un prompt." };
  }
  if (prompts.length > MAX_PROMPTS_PER_RUN) {
    return { success: false as const, message: `Massimo ${MAX_PROMPTS_PER_RUN} prompt per run.` };
  }

  const { data: run, error: runError } = await access.admin
    .from("image_benchmark_runs")
    .insert({
      title,
      description: input.description?.trim() || null,
      created_by: access.userId,
    } as never)
    .select("id")
    .single();

  if (runError || !run) {
    return { success: false as const, message: runError?.message ?? "Errore creazione run." };
  }

  const runId = (run as { id: string }).id;
  const promptRows = prompts.map((p, index) => ({
    run_id: runId,
    category: p.category,
    prompt: p.prompt.trim(),
    aspect_ratio: p.aspectRatio,
    sort_order: index,
  }));

  const { error: promptsError } = await access.admin.from("image_benchmark_prompts").insert(promptRows as never);
  if (promptsError) {
    return { success: false as const, message: promptsError.message };
  }

  revalidatePath("/admin/image-benchmark");
  return { success: true as const, runId };
}

export async function runImageBenchmarkPromptAction(input: {
  runId: string;
  promptId: string;
}) {
  const access = await ensureImageBenchmarkAdmin();
  if (!access.ok) return { success: false as const, message: access.message };

  const rate = checkImageBenchmarkRateLimit(access.userId);
  if (!rate.ok) return { success: false as const, message: rate.message };

  const models = benchmarkModels();

  const { data: prompt, error } = await access.admin
    .from("image_benchmark_prompts")
    .select("*")
    .eq("id", input.promptId)
    .eq("run_id", input.runId)
    .single();

  if (error || !prompt) {
    return { success: false as const, message: error?.message ?? "Prompt non trovato." };
  }

  const row = prompt as { prompt: string; aspect_ratio: string; category: string };
  const result = await runBenchmarkPromptAgainstModels(access.admin, {
    runId: input.runId,
    promptId: input.promptId,
    category: row.category,
    userPrompt: row.prompt,
    aspectRatio: row.aspect_ratio,
    models,
  });

  if (!result.ok) return { success: false as const, message: result.message };

  revalidatePath(`/admin/image-benchmark/${input.runId}`);
  return { success: true as const, resultIds: result.resultIds };
}

export async function runFullImageBenchmarkAction(input: { runId: string }) {
  const access = await ensureImageBenchmarkAdmin();
  if (!access.ok) return { success: false as const, message: access.message };

  const { data: prompts, error } = await access.admin
    .from("image_benchmark_prompts")
    .select("id")
    .eq("run_id", input.runId)
    .order("sort_order", { ascending: true });

  if (error) return { success: false as const, message: error.message };
  if (!prompts?.length) return { success: false as const, message: "Nessun prompt nella run." };

  const summary: string[] = [];
  for (const p of prompts) {
    const promptId = (p as { id: string }).id;
    const res = await runImageBenchmarkPromptAction({
      runId: input.runId,
      promptId,
    });
    summary.push(res.success ? `Prompt ${promptId}: ok` : `Prompt ${promptId}: ${res.message}`);
  }

  revalidatePath(`/admin/image-benchmark/${input.runId}`);
  return { success: true as const, summary };
}

export async function saveImageBenchmarkScoreAction(input: BenchmarkScoreInput) {
  const access = await ensureImageBenchmarkAdmin();
  if (!access.ok) return { success: false as const, message: access.message };

  const scores = [
    input.aestheticScore,
    input.promptAdherenceScore,
    input.textRenderingScore,
    input.fantasyUsefulnessScore,
    input.productionReadyScore,
    input.campaignCoherenceScore,
  ];

  if (scores.some((s) => s < 1 || s > 5)) {
    return { success: false as const, message: "I voti devono essere tra 1 e 5." };
  }

  const { error } = await access.admin.from("image_benchmark_scores").upsert(
    {
      result_id: input.resultId,
      aesthetic_score: input.aestheticScore,
      prompt_adherence_score: input.promptAdherenceScore,
      text_rendering_score: input.textRenderingScore,
      fantasy_usefulness_score: input.fantasyUsefulnessScore,
      production_ready_score: input.productionReadyScore,
      campaign_coherence_score: input.campaignCoherenceScore,
      notes: input.notes?.trim() || null,
      scored_by: access.userId,
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: "result_id" }
  );

  if (error) return { success: false as const, message: error.message };

  revalidatePath("/admin/image-benchmark");
  return { success: true as const };
}

export async function previewBenchmarkPromptAction(input: {
  category: string;
  userPrompt: string;
}) {
  const access = await ensureImageBenchmarkAdmin();
  if (!access.ok) return { success: false as const, message: access.message };

  const built = await buildBenchmarkImagePrompt(access.admin, input);
  if ("error" in built) return { success: false as const, message: built.error };

  return {
    success: true as const,
    userPrompt: built.userPrompt,
    assembledPrompt: built.assembledPrompt,
    campaignName: built.campaignName,
    loreIncluded: built.loreIncluded,
    loreSkipReason: built.loreSkipReason,
  };
}

export type ModelReportRow = {
  model: string;
  successCount: number;
  errorCount: number;
  pendingCount: number;
  avgDurationMs: number | null;
  totalCostUsd: number | null;
  avgOverallScore: number | null;
  scoredCount: number;
  categoryScores: Record<string, number | null>;
};

export async function getImageBenchmarkReportAction(runId: string) {
  const access = await ensureImageBenchmarkAdmin();
  if (!access.ok) return { success: false as const, message: access.message };

  const loaded = await getImageBenchmarkRunAction(runId);
  if (!loaded.success) return loaded;

  const { results, scores, prompts } = loaded;
  const scoreByResult = new Map(scores.map((s) => [(s as { result_id: string }).result_id, s]));
  const promptCategoryById = new Map(
    prompts.map((p) => [(p as { id: string }).id, (p as { category: string }).category])
  );

  const byModel = new Map<string, ModelReportRow>();

  for (const raw of results) {
    const r = raw as {
      id: string;
      model: string;
      status: string;
      duration_ms: number | null;
      estimated_cost_usd: number | null;
      prompt_id: string;
    };

    if (!byModel.has(r.model)) {
      byModel.set(r.model, {
        model: r.model,
        successCount: 0,
        errorCount: 0,
        pendingCount: 0,
        avgDurationMs: null,
        totalCostUsd: 0,
        avgOverallScore: null,
        scoredCount: 0,
        categoryScores: {},
      });
    }

    const row = byModel.get(r.model)!;
    if (r.status === "success") row.successCount += 1;
    else if (r.status === "error") row.errorCount += 1;
    else row.pendingCount += 1;

    if (typeof r.duration_ms === "number") {
      row.avgDurationMs = row.avgDurationMs == null ? r.duration_ms : (row.avgDurationMs + r.duration_ms) / 2;
    }
    if (typeof r.estimated_cost_usd === "number") {
      row.totalCostUsd = (row.totalCostUsd ?? 0) + r.estimated_cost_usd;
    }

    const score = scoreByResult.get(r.id);
    if (score) {
      const avg = averageScore(score as Parameters<typeof averageScore>[0]);
      if (avg != null) {
        row.scoredCount += 1;
        row.avgOverallScore =
          row.avgOverallScore == null ? avg : (row.avgOverallScore + avg) / 2;
        const category = promptCategoryById.get(r.prompt_id) ?? "Altro";
        const prev = row.categoryScores[category];
        row.categoryScores[category] = prev == null ? avg : (prev + avg) / 2;
      }
    }
  }

  const ranking = [...byModel.values()].sort((a, b) => {
    const scoreA = a.avgOverallScore ?? 0;
    const scoreB = b.avgOverallScore ?? 0;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return b.successCount - a.successCount;
  });

  return { success: true as const, ranking };
}
