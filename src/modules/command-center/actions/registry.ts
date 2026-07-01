import { createSupabaseServerClient } from "@/utils/supabase/server";
import { getTenantAdapter } from "../adapters";
import type {
  ActionContext,
  ExecuteActionOptions,
  RegisteredAction,
  RegistryResult,
} from "../types/actions";
import { writeAuditEvent, snapshotValue } from "./audit";

const registry = new Map<string, RegisteredAction>();

export function registerAction<TInput, TResult>(action: RegisteredAction<TInput, TResult>): void {
  if (registry.has(action.name)) {
    throw new Error(`Action già registrata: ${action.name}`);
  }
  registry.set(action.name, action as RegisteredAction);
}

export function getRegisteredAction(name: string): RegisteredAction | undefined {
  return registry.get(name);
}

export function listRegisteredActionNames(): string[] {
  return Array.from(registry.keys()).sort();
}

export async function resolveActionContext(
  actorType: ActionContext["actorType"] = "user"
): Promise<{ ok: true; ctx: ActionContext } | { ok: false; error: string }> {
  const adapter = getTenantAdapter();
  const supabase = await createSupabaseServerClient();
  const access = await adapter.assertCanAccessCommandCenter(supabase);
  if (!access.ok) return access;

  return {
    ok: true,
    ctx: {
      ...access.ctx,
      actorType,
      supabase,
      adapter,
    },
  };
}

export async function previewAction<T = unknown>(
  name: string,
  input: unknown,
  options?: ExecuteActionOptions
): Promise<RegistryResult<T>> {
  return executeAction<T>(name, input, { ...options, previewOnly: true });
}

export async function executeAction<T = unknown>(
  name: string,
  input: unknown,
  options?: ExecuteActionOptions
): Promise<RegistryResult<T>> {
  const action = registry.get(name);
  if (!action) {
    return { success: false, error: `Action non registrata: ${name}` };
  }

  const validated = action.validate(input);
  if (!validated.ok) {
    return { success: false, error: validated.error };
  }

  const resolved = await resolveActionContext(options?.actorType ?? "user");
  if (!resolved.ok) return { success: false, error: resolved.error };
  const ctx = resolved.ctx;

  if (action.authorize) {
    const authz = await action.authorize(ctx, validated.data);
    if (!authz.ok) return { success: false, error: authz.error };
  }

  if (options?.previewOnly) {
    if (!action.preview) {
      return {
        success: true,
        data: { action: name, input: validated.data } as T,
      };
    }
    const preview = await action.preview(ctx, validated.data);
    return { success: true, data: preview as T };
  }

  const beforeSnapshot = action.loadBefore
    ? await action.loadBefore(ctx, validated.data)
    : null;

  let result: unknown;
  try {
    result = await action.execute(ctx, validated.data);
  } catch (err) {
    console.error(`[executeAction] ${name}`, err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Errore durante l'esecuzione dell'action.",
    };
  }

  if (!options?.skipAudit) {
    const entity = action.auditEntity?.(validated.data, result) ?? null;
    await writeAuditEvent(ctx.supabase, {
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
      actorType: ctx.actorType,
      actionName: name,
      entityType: entity?.entityType ?? null,
      entityId: entity?.entityId ?? null,
      beforeSnapshot,
      afterSnapshot: snapshotValue(result),
      metadata: { input: validated.data, ...(options?.auditMetadata ?? {}) },
    });
  }

  if (action.revalidatePaths) {
    const { revalidatePath } = await import("next/cache");
    for (const path of action.revalidatePaths(validated.data, result)) {
      revalidatePath(path);
    }
  }

  return { success: true, data: result as T };
}
