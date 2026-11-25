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
