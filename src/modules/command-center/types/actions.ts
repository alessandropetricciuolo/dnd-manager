import type { CommandCenterAuthContext, TenantAdapter } from "../adapters/types";
import type { createSupabaseServerClient } from "@/utils/supabase/server";

export type ActionActorType = "user" | "ai" | "system";

export type ActionSupabase = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type ActionContext = CommandCenterAuthContext & {
  actorType: ActionActorType;
  supabase: ActionSupabase;
  adapter: TenantAdapter;
};

export type RegistryResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

export type ValidationResult<T> = { ok: true; data: T } | { ok: false; error: string };

export type AuditEntityRef = {
  entityType: string;
  entityId: string;
};

export type RegisteredAction<TInput = unknown, TResult = unknown> = {
  name: string;
  description: string;
  category: "workspace" | "command" | "campaign" | "wiki" | "session" | "gm";
  validate: (input: unknown) => ValidationResult<TInput>;
  authorize?: (ctx: ActionContext, input: TInput) => Promise<{ ok: true } | { ok: false; error: string }>;
  preview?: (ctx: ActionContext, input: TInput) => Promise<Record<string, unknown>>;
  loadBefore?: (ctx: ActionContext, input: TInput) => Promise<Record<string, unknown> | null>;
  execute: (ctx: ActionContext, input: TInput) => Promise<TResult>;
  auditEntity?: (input: TInput, result: TResult) => AuditEntityRef | null;
  revalidatePaths?: (input: TInput, result: TResult) => string[];
};

export type ExecuteActionOptions = {
  actorType?: ActionActorType;
  skipAudit?: boolean;
  previewOnly?: boolean;
};
