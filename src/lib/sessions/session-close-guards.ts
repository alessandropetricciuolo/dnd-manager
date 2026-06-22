export type SessionPreCloseRow = {
  status: string;
  is_pre_closed?: boolean | null;
};

/** Decide whether pre-close side effects (XP, attendance counters) should run. */
export function shouldApplyPreCloseSideEffects(session: SessionPreCloseRow): boolean {
  return session.status === "scheduled" && session.is_pre_closed !== true;
}

/** Whether a close-session status transition is still allowed. */
export function canTransitionSessionToCompleted(session: Pick<SessionPreCloseRow, "status">): boolean {
  return session.status === "scheduled";
}
