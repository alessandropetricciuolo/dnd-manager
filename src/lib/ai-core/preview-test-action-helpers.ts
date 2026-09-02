import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { createAiPreviewTestRun, type CreateAiPreviewTestRunInput } from "./preview-test-audit";

export async function persistPreviewTestRun(
  admin: SupabaseClient<Database>,
  input: CreateAiPreviewTestRunInput
): Promise<{ runId: string; auditPersisted: boolean }> {
  try {
    const created = await createAiPreviewTestRun(admin, input);
    return { runId: created.id, auditPersisted: true };
  } catch (error) {
    console.error("[preview-test-audit] insert failed", {
      kind: input.kind,
      reason: "audit_insert_error",
    });
    return { runId: `preview-test-audit-failed-${Date.now()}`, auditPersisted: false };
  }
}
