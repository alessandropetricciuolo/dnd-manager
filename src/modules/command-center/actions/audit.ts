import type { ActionSupabase } from "../types/actions";
import type { WriteAuditEventInput } from "../types/audit";

export async function writeAuditEvent(
  supabase: ActionSupabase,
  input: WriteAuditEventInput
): Promise<void> {
  const { error } = await supabase.from("app_audit_events").insert({
    workspace_id: input.workspaceId,
    user_id: input.userId,
    actor_type: input.actorType,
    action_name: input.actionName,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    before_snapshot: input.beforeSnapshot ?? null,
    after_snapshot: input.afterSnapshot ?? null,
    metadata: input.metadata ?? {},
  });

  if (error) {
    console.error("[writeAuditEvent]", input.actionName, error);
  }
}

export function snapshotValue(value: unknown): Record<string, unknown> | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return { value };
}
