import { z } from 'zod';

export const pushDeviceSchema = z.object({
  token: z.string().regex(/^(Expo|Exponent)PushToken\[[A-Za-z0-9_-]+\]$/).max(250),
  platform: z.enum(['ios', 'android']),
  enabled: z.boolean(),
  whispers: z.boolean(),
  sessions: z.boolean(),
}).strict();

export type PushJob = {
  id: number; user_id: string; token: string; kind: 'whisper' | 'session_changed' | 'session_reminder';
  campaign_id: string | null; session_id: string | null; source_id: string; attempts: number;
};

export function pushPayload(job: PushJob) {
  return {
    to: job.token, sound: 'default', channelId: 'campaigns', title: 'Barber & Dragons',
    body: job.kind === 'whisper' ? 'Hai ricevuto un nuovo sussurro.' :
      job.kind === 'session_reminder' ? 'La tua sessione inizia tra circa un’ora.' : 'Una sessione a cui sei iscritto è stata aggiornata.',
    // Never put private message contents, player names or GM notes on the lock screen.
    data: { kind: job.kind, campaignId: job.campaign_id, sessionId: job.session_id, recipientId: job.user_id },
  };
}

export function ticketOutcome(ticket: { status?: string; id?: string; details?: { error?: string } } | undefined, attempt: number) {
  if (ticket?.status === 'ok' && ticket.id) return { status: 'ticket', ticket_id: ticket.id, last_error: null };
  const code = ticket?.details?.error || 'ExpoUnavailable';
  return { status: code === 'DeviceNotRegistered' || attempt >= 5 ? 'failed' : 'pending', ticket_id: null, last_error: code };
}

export function retryAt(attempt: number, now = Date.now()) {
  return new Date(now + Math.min(3600, 30 * 2 ** attempt) * 1000).toISOString();
}
