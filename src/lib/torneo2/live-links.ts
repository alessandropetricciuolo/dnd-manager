function withOrigin(path: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}${path}`;
  }
  return path;
}

export function torneo2TimerUrl(livePublicId: string, matchId: string): string {
  return withOrigin(`/torneo2-live/${livePublicId}/timer/${matchId}`);
}

export function torneo2TableUrl(livePublicId: string, matchId: string): string {
  return withOrigin(`/torneo2-live/${livePublicId}/table/${matchId}`);
}

export function torneo2BoardUrl(livePublicId: string): string {
  return withOrigin(`/torneo2-live/${livePublicId}/board`);
}

export function torneo2RemoteJoinUrl(remotePublicId: string, plainToken: string): string {
  return withOrigin(`/torneo2/remote/${remotePublicId}#t=${encodeURIComponent(plainToken)}`);
}
