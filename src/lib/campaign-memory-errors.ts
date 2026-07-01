export function memorySchemaMissingMessage(): string {
  return "Lo schema della memoria interrogabile non è ancora disponibile su Supabase. Applica la migration della tabella `campaign_memory_chunks` e dell'RPC `match_campaign_memory`, poi riprova.";
}

export function memorySourceTypesMigrationMessage(): string {
  return "La migration che estende i tipi di fonte della memoria campagna non è ancora applicata su Supabase (mission, metadati campagna). Applica `supabase/migrations/20260701120000_campaign_memory_missions_and_campaign.sql` e riprova.";
}

export function isMemorySchemaMissingError(message: string): boolean {
  const lower = message.toLowerCase();
  if (
    lower.includes("violates check constraint") ||
    lower.includes("violates foreign key constraint") ||
    lower.includes("violates not-null constraint")
  ) {
    return false;
  }
  if (/relation ["']?public\.campaign_memory_chunks["']? does not exist/i.test(message)) {
    return true;
  }
  if (/relation ["']?campaign_memory_chunks["']? does not exist/i.test(message)) {
    return true;
  }
  if (/function .*match_campaign_memory.* does not exist/i.test(message)) {
    return true;
  }
  if (lower.includes("could not find the table") && lower.includes("campaign_memory_chunks")) {
    return true;
  }
  if (lower.includes("schema cache") && lower.includes("campaign_memory")) {
    return true;
  }
  return false;
}

export function formatCampaignMemoryActionError(
  error: unknown,
  fallback: string
): string {
  if (!(error instanceof Error)) return fallback;
  if (/campaign_memory_chunks_source_type_check/i.test(error.message)) {
    return memorySourceTypesMigrationMessage();
  }
  if (isMemorySchemaMissingError(error.message)) {
    return memorySchemaMissingMessage();
  }
  return error.message;
}
