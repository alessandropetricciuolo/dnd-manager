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

export async function listBlockedWhisperUsers(blockerId: string): Promise<Array<{ blocked_id: string; created_at: string }>> {
  const { data, error } = await (supabase as any)
    .from('whisper_user_blocks')
    .select('blocked_id, created_at')
    .eq('blocker_id', blockerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function unblockWhisperUser(blockerId: string, blockedId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('whisper_user_blocks')
    .delete()
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId);
  if (error) throw error;
}
