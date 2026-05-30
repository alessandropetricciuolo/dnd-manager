export function torneoLiveTableUrl(livePublicId: string, matchId: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/torneo-live/${livePublicId}/table/${matchId}`;
  }
  return `/torneo-live/${livePublicId}/table/${matchId}`;
}

export function torneoLiveBracketUrl(livePublicId: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/torneo-live/${livePublicId}/bracket`;
  }
  return `/torneo-live/${livePublicId}/bracket`;
}

export function torneoLiveTimerUrl(livePublicId: string, matchId: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/torneo-live/${livePublicId}/timer/${matchId}`;
  }
  return `/torneo-live/${livePublicId}/timer/${matchId}`;
}

/** Schermo pubblico tabellone (proiezione su secondo monitor, richiede login GM). */
export function torneoTabelloneUrl(campaignId: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/campaigns/${campaignId}/torneo-tabellone`;
  }
  return `/campaigns/${campaignId}/torneo-tabellone`;
}

export function gmRemoteJoinUrl(remotePublicId: string, plainToken: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/gm-remote/j/${remotePublicId}#t=${encodeURIComponent(plainToken)}`;
  }
  return `/gm-remote/j/${remotePublicId}#t=${encodeURIComponent(plainToken)}`;
}
