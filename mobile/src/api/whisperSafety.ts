import { supabase } from './supabase';

export async function reportWhisper(input: {
  reporterId: string;
  reportedUserId: string;
  whisperId: string;
  campaignId: string;
  reason?: string;
}): Promise<void> {
  const { error } = await (supabase as any).from('whisper_reports').insert({
    reporter_id: input.reporterId,
    reported_user_id: input.reportedUserId,
    whisper_id: input.whisperId,
    campaign_id: input.campaignId,
    reason: input.reason ?? 'Comportamento inappropriato',
  });
  if (error) throw error;
}

export async function blockWhisperUser(blockerId: string, blockedId: string): Promise<void> {
  const { data: existing, error: lookupError } = await (supabase as any)
    .from('whisper_user_blocks')
    .select('blocked_id')
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (existing) return;

  const { error } = await (supabase as any).from('whisper_user_blocks').insert({
    blocker_id: blockerId,
    blocked_id: blockedId,
  });
  if (error) throw error;
}

export async function listBlockedWhisperUsers(
  blockerId: string
): Promise<Array<{ blocked_id: string; created_at: string; blocked_name?: string | null }>> {
  const { data, error } = await (supabase as any)
    .from('whisper_user_blocks')
    .select('blocked_id, created_at')
    .eq('blocker_id', blockerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows: Array<{ blocked_id: string; created_at: string }> = data ?? [];
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.blocked_id);
  const { data: profilesData } = await (supabase as any)
    .from('profiles')
    .select('id, display_name, nickname')
    .in('id', ids);

  const nameMap = new Map<string, string>();
  if (Array.isArray(profilesData)) {
    for (const p of profilesData) {
      const label = p?.display_name || p?.nickname;
      if (p?.id && label) {
        nameMap.set(p.id, label);
      }
    }
  }

  return rows.map((r) => ({
    ...r,
    blocked_name: nameMap.get(r.blocked_id) ?? null,
  }));
}

export async function unblockWhisperUser(blockerId: string, blockedId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('whisper_user_blocks')
    .delete()
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId);
  if (error) throw error;
}
