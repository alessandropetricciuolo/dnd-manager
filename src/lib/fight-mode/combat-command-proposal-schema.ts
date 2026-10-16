import { z } from "zod";
import { getCombatStatusDefinition } from "@/lib/combat-conditions";
import type { CombatCommandProposal } from "./types";

const id = z.string().trim().min(1).max(120);
const label = z.string().trim().min(1).max(160);
const amount = z.number().finite().int().min(0).max(10000);
const operation = z.discriminatedUnion("kind", [
  z.object({ id, kind: z.literal("damage"), targetId: id, targetName: label, amount: amount.min(1), sourceLabel: z.string().max(160).optional() }).strict(),
  z.object({ id, kind: z.literal("heal"), targetId: id, targetName: label, amount: amount.min(1) }).strict(),
  z.object({ id, kind: z.literal("set_exact_hp"), targetId: id, targetName: label, exactHp: amount }).strict(),
  z.object({ id, kind: z.literal("add_effect"), targetId: id, targetName: label, statusId: z.string().trim().min(1).max(100), label, sourceCasterId: id.optional(), sourceName: label.optional(), linkToConcentration: z.boolean().optional(), spellName: label.optional(), durationTurns: amount.nullable().optional() }).strict(),
  z.object({ id, kind: z.literal("remove_effect"), targetId: id, targetName: label, statusId: z.string().trim().min(1).max(100).optional(), effectId: id.optional() }).strict(),
  z.object({ id, kind: z.literal("start_concentration"), casterId: id, casterName: label, spellName: label, targetIds: z.array(id).max(100).optional(), linkedStatusId: z.string().trim().min(1).max(100).optional() }).strict(),
  z.object({ id, kind: z.literal("break_concentration"), casterId: id, casterName: label }).strict(),
]);

const proposal = z.object({
  proposalId: id,
  source: z.enum(["local", "ai"]),
  rawInput: z.string().max(2000),
  stateSignatureAtCreation: z.string().min(1).max(20000),
  operations: z.array(operation).max(100),
  unresolvedTargets: z.array(z.object({ query: label, reason: z.enum(["not_found", "ambiguous"]), candidates: z.array(z.object({ id, name: label }).strict()).max(100).optional(), intent: z.unknown().optional() }).strict()).max(100),
  missingData: z.array(z.object({ operationId: id, field: z.enum(["amount", "exactHp", "spellName", "casterId", "sourceCasterId", "durationTurns", "statusId", "command_syntax"]), message: z.string().trim().min(1).max(300) }).strict()).max(100),
  explanation: z.string().max(1000).optional(),
}).strict();

/** Full runtime shape check used immediately before a proposal can mutate combat state. */
export function validateCombatCommandProposal(value: unknown): value is CombatCommandProposal {
  const parsed = proposal.safeParse(value);
  if (!parsed.success) return false;
  const starts = parsed.data.operations.filter((op) => op.kind === "start_concentration");
  const linkedEffects = parsed.data.operations.filter((op) => op.kind === "add_effect" && (op.linkToConcentration ?? Boolean(getCombatStatusDefinition(op.statusId)?.requiresConcentration)));
  if (starts.some((start) => linkedEffects.some((effect) => effect.kind === "add_effect" && effect.sourceCasterId === start.casterId && effect.spellName?.toLowerCase() === start.spellName.toLowerCase()))) return false;
  return parsed.data.operations.every((op) => {
    if (op.kind === "remove_effect") return Boolean(op.statusId || op.effectId);
    if (op.kind === "add_effect") {
      const customStatus = /^custom:[a-z0-9àèéìòù_-]{1,80}$/i.test(op.statusId);
      const definition = getCombatStatusDefinition(op.statusId);
      const concentrationIntent = op.linkToConcentration ?? Boolean(definition?.requiresConcentration);
      return (Boolean(definition) || customStatus) && (!concentrationIntent || Boolean(op.sourceCasterId && op.spellName));
    }
    if (op.kind === "start_concentration") {
      return !op.linkedStatusId || Boolean(getCombatStatusDefinition(op.linkedStatusId)) || /^custom:[a-z0-9àèéìòù_-]{1,80}$/i.test(op.linkedStatusId);
    }
    return true;
  });
}
