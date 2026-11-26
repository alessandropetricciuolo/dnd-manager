import { PlayerSession, SessionSignup, SessionSignupStatus } from '../types';

export function countConfirmedSignups(signups: Pick<SessionSignup, 'status'>[]): number {
  return signups.filter(
    (s) => s.status === 'confirmed' || s.status === 'approved' || s.status === 'attended'
  ).length;
}

export function resolveSignupTargetStatus(
  signups: Pick<SessionSignup, 'status'>[],
  maxPlayers?: number | null
): SessionSignupStatus {
  const cap = maxPlayers ?? 6;
  return countConfirmedSignups(signups) >= cap ? 'waitlist' : 'confirmed';
}

export function enrichPlayerSession(rawSession: any, currentUserId?: string): PlayerSession {
  const signups: SessionSignup[] = Array.isArray(rawSession.session_signups)
    ? rawSession.session_signups
    : [];

  const mySignup = currentUserId
    ? signups.find((s) => s.player_id === currentUserId && s.status !== 'cancelled') ?? null
    : null;

  const confirmedCount = countConfirmedSignups(signups);
  const isFull = confirmedCount >= (rawSession.max_players ?? 6);
  const isConfirmed =
    mySignup?.status === 'confirmed' ||
    mySignup?.status === 'approved' ||
    mySignup?.status === 'attended';
  const isWaitlist = mySignup?.status === 'waitlist';

  return {
    ...rawSession,
    session_signups: signups,
    mySignup,
    confirmedCount,
    isConfirmed,
    isWaitlist,
    isFull,
  };
}

export function normalizeSessionPartyBadge(
  rawParty:
    | { name?: string | null; color?: string | null }
    | Array<{ name?: string | null; color?: string | null }>
    | null
    | undefined,
): { name: string; color: string } | null {
  const entry = Array.isArray(rawParty) ? rawParty[0] : rawParty;
  const name = typeof entry?.name === 'string' ? entry.name.trim() : '';
  if (!name) return null;
  const color =
    typeof entry?.color === 'string' && entry.color.trim()
      ? entry.color.trim()
      : '#D4AF37';
  return { name, color };
}

export function canPlayerSeeCompletedSession(
  session: Pick<PlayerSession, 'status' | 'campaign_id' | 'party_id' | 'campaigns' | 'isConfirmed' | 'mySignup'>,
  options: {
    isGmOrAdmin: boolean;
    memberPartyByCampaignId: Record<string, string | null | undefined>;
  },
): boolean {
  if (session.status !== 'completed') return true;
  if (options.isGmOrAdmin) return true;
  if (session.campaigns?.type !== 'long') return true;

  // Player personally signed up / attended this session
  if (session.isConfirmed || session.mySignup?.status === 'attended') {
    return true;
  }

  const campId = session.campaign_id;
  if (!campId || !(campId in options.memberPartyByCampaignId)) {
    return false;
  }

  const playerPartyId = options.memberPartyByCampaignId[campId] ?? null;
  if (!session.party_id) return true;
  return session.party_id === playerPartyId;
}

export function validateSessionFeedbackPayload(payload: {
  sessionRating: number;
  campaignRating: number;
  comment?: string | null;
}): {
  valid: boolean;
  sessionRating: number;
  campaignRating: number;
  comment: string | null;
  error?: string;
} {
  const sessionRating = Math.floor(payload.sessionRating);
  const campaignRating = Math.floor(payload.campaignRating);
  if (
    !Number.isFinite(sessionRating) ||
    !Number.isFinite(campaignRating) ||
    sessionRating < 1 ||
    sessionRating > 5 ||
    campaignRating < 1 ||
    campaignRating > 5
  ) {
    return {
      valid: false,
      sessionRating: 0,
      campaignRating: 0,
      comment: null,
      error: 'Le valutazioni devono essere comprese tra 1 e 5 stelle.',
    };
  }
  return {
    valid: true,
    sessionRating,
    campaignRating,
    comment: payload.comment?.trim() ? payload.comment.trim() : null,
  };
}
