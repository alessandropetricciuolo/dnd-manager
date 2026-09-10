import { isGlobalAdmin, type AdminContentAccess } from "./access";

export type AdminContentTransition = "create" | "protect" | "release";
export type AdminContentEntityType = "wiki" | "map";

export type AdminContentTransitionAuditInput = {
  action: AdminContentTransition;
  access: AdminContentAccess;
  campaignId: string;
  entityType: AdminContentEntityType;
  entityId: string;
};

export type AdminContentAuditLogger = {
  info(event: string, fields: Record<string, string>): void;
};

const consoleAuditLogger: AdminContentAuditLogger = {
  info(event, fields) {
    console.info(event, fields);
  },
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Emits identifiers and transition metadata only; content is not accepted. */
export function logAdminContentTransition(
  input: AdminContentTransitionAuditInput,
  logger: AdminContentAuditLogger = consoleAuditLogger
): void {
  if (!isGlobalAdmin(input.access)) {
    throw new Error("admin_content_audit_requires_verified_admin");
  }
  const actorId = input.access.actor.userId;
  if (
    !actorId ||
    !UUID_PATTERN.test(actorId) ||
    !UUID_PATTERN.test(input.campaignId) ||
    !UUID_PATTERN.test(input.entityId)
  ) {
    throw new Error("admin_content_audit_invalid_identifier");
  }
  logger.info("admin_content_access_transition", {
    action: input.action,
    actorId,
    campaignId: input.campaignId,
    entityType: input.entityType,
    entityId: input.entityId,
  });
}
