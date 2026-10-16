import { z } from "zod";

const id = z.string().trim().min(1).max(120);
const name = z.string().trim().min(1).max(160);
const boundedInt = z.number().finite().int().min(0).max(10000);

const operationSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("damage"), targetId: id, targetName: name.optional(), amount: boundedInt.optional(), sourceLabel: z.string().trim().max(160).optional() }).strict(),
  z.object({ kind: z.literal("heal"), targetId: id, targetName: name.optional(), amount: boundedInt.optional() }).strict(),
  z.object({ kind: z.literal("set_exact_hp"), targetId: id, targetName: name.optional(), exactHp: boundedInt.optional() }).strict(),
  z.object({ kind: z.literal("add_effect"), targetId: id, targetName: name.optional(), statusId: z.string().trim().min(1).max(100).optional(), label: name.optional(), sourceCasterId: id.optional(), sourceName: name.optional(), linkToConcentration: z.boolean().optional(), durationTurns: boundedInt.nullable().optional(), spellName: name.optional() }).strict(),
  z.object({ kind: z.literal("remove_effect"), targetId: id, targetName: name.optional(), statusId: z.string().trim().min(1).max(100).optional(), effectId: id.optional() }).strict(),
  z.object({ kind: z.literal("start_concentration"), casterId: id.optional(), casterName: name.optional(), spellName: name.optional(), targetIds: z.array(id).max(100).optional(), linkedStatusId: z.string().trim().min(1).max(100).optional() }).strict(),
  z.object({ kind: z.literal("break_concentration"), casterId: id.optional(), casterName: name.optional() }).strict(),
]);

const payloadSchema = z.object({
  explanation: z.string().trim().max(1000).optional(),
  operations: z.array(operationSchema).max(100),
  unresolvedTargets: z.array(z.object({ query: z.string().trim().min(1).max(160), reason: z.enum(["not_found", "ambiguous"]), candidateNames: z.array(name).max(100).optional() }).strict()).max(100).optional(),
  missingData: z.array(z.object({ operationId: id.optional(), field: z.enum(["amount", "exactHp", "spellName", "casterId", "sourceCasterId", "durationTurns", "statusId"]), message: z.string().trim().min(1).max(300) }).strict()).max(100).optional(),
}).strict();

export type ValidatedAiCombatPayload = z.infer<typeof payloadSchema>;

/** Pure boundary validator: malformed or out-of-domain provider output is rejected as a whole. */
export function validateAiCombatPayload(value: unknown):
  | { success: true; data: ValidatedAiCombatPayload }
  | { success: false; error: string } {
  const parsed = payloadSchema.safeParse(value);
  return parsed.success
    ? { success: true, data: parsed.data }
    : { success: false, error: "La risposta IA non rispetta lo schema dei comandi tattici." };
}
