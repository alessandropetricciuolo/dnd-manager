import type { Json } from "@/types/database.types";

export type BenchmarkResultStatus = "pending" | "success" | "error";

export type ImageBenchmarkCategory =
  | "NPC fantasy"
  | "Mostro"
  | "Luogo"
  | "Oggetto magico"
  | "Handout"
  | "Locandina"
  | "Token portrait"
  | "Mappa / ambiente";

export type ImageGenerationInput = {
  model: string;
  prompt: string;
  aspectRatio: string;
};

export type ImageGenerationOutput = {
  success: boolean;
  imageUrl?: string;
  imageBase64?: string;
  rawResponse: unknown;
  durationMs: number;
  estimatedCostUsd?: number;
  errorMessage?: string;
};

export type RunBenchmarkInput = {
  runId: string;
  promptId: string;
  prompt: string;
  aspectRatio: string;
  models: string[];
};

export type BenchmarkRunRow = {
  id: string;
  title: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
};

export type BenchmarkPromptRow = {
  id: string;
  run_id: string;
  category: string;
  prompt: string;
  aspect_ratio: string;
  sort_order: number;
  created_at: string;
};

export type BenchmarkResultRow = {
  id: string;
  run_id: string;
  prompt_id: string;
  provider: string;
  model: string;
  prompt: string;
  aspect_ratio: string;
  image_url: string | null;
  image_base64: string | null;
  raw_response: Json | null;
  duration_ms: number | null;
  estimated_cost_usd: number | null;
  status: BenchmarkResultStatus;
  error_message: string | null;
  created_at: string;
};

export type BenchmarkScoreRow = {
  id: string;
  result_id: string;
  aesthetic_score: number | null;
  prompt_adherence_score: number | null;
  text_rendering_score: number | null;
  fantasy_usefulness_score: number | null;
  production_ready_score: number | null;
  notes: string | null;
  scored_by: string | null;
  created_at: string;
  updated_at: string;
};

export type BenchmarkScoreInput = {
  resultId: string;
  aestheticScore: number;
  promptAdherenceScore: number;
  textRenderingScore: number;
  fantasyUsefulnessScore: number;
  productionReadyScore: number;
  notes?: string;
};

export function averageScore(score: Pick<
  BenchmarkScoreRow,
  | "aesthetic_score"
  | "prompt_adherence_score"
  | "text_rendering_score"
  | "fantasy_usefulness_score"
  | "production_ready_score"
>): number | null {
  const values = [
    score.aesthetic_score,
    score.prompt_adherence_score,
    score.text_rendering_score,
    score.fantasy_usefulness_score,
    score.production_ready_score,
  ].filter((v): v is number => typeof v === "number");

  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
