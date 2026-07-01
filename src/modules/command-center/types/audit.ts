export type AuditActorType = "user" | "ai" | "system";

export type AppAuditEventRow = {
  id: string;
  workspace_id: string | null;
  user_id: string | null;
  actor_type: AuditActorType;
  action_name: string;
  entity_type: string | null;
  entity_id: string | null;
  before_snapshot: Record<string, unknown> | null;
  after_snapshot: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type WriteAuditEventInput = {
  workspaceId: string | null;
  userId: string | null;
  actorType: AuditActorType;
  actionName: string;
  entityType?: string | null;
  entityId?: string | null;
  beforeSnapshot?: Record<string, unknown> | null;
  afterSnapshot?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
};
