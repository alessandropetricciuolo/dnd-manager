import { WhisperMessage } from '../types';

export function reconcileRealtimeWhisper(
  prev: WhisperMessage[],
  incoming: WhisperMessage
): WhisperMessage[] {
  if (!incoming || !incoming.id) return prev;
  if (prev.some((m) => m.id === incoming.id)) {
    return prev;
  }

  const optimisticIndex = prev.findIndex(
    (m) =>
      m.id.startsWith('optimistic-') &&
      m.sender_id === incoming.sender_id &&
      m.receiver_id === incoming.receiver_id &&
      m.message === incoming.message
  );

  if (optimisticIndex !== -1) {
    const next = [...prev];
    next[optimisticIndex] = incoming;
    return next;
  }

  return [...prev, incoming];
}

export function reconcileConfirmedWhisper(
  prev: WhisperMessage[],
  optimisticId: string,
  confirmed: WhisperMessage
): WhisperMessage[] {
  const alreadyPresent = prev.some((m) => m.id === confirmed.id);
  if (alreadyPresent) {
    return prev.filter((m) => m.id !== optimisticId);
  }

  const hasOptimistic = prev.some((m) => m.id === optimisticId);
  if (hasOptimistic) {
    return prev.map((m) => (m.id === optimisticId ? confirmed : m));
  }

  return [...prev, confirmed];
}

export function removeOptimisticWhisper(
  prev: WhisperMessage[],
  optimisticId: string
): WhisperMessage[] {
  return prev.filter((m) => m.id !== optimisticId);
}

const OBJECTIONABLE_PATTERNS: RegExp[] = [
  /\b(vaffanculo|stronzo|stronza|pezzo di merda|testa di cazzo|figlio di puttana|troia|puttana|negro|frocio)\b/i,
  /\b(fuck you|motherfucker|bitch|asshole|cunt|nigger|faggot|kys|kill yourself)\b/i,
];

export function containsObjectionableContent(text: string): boolean {
  const normalized = text.trim();
  if (!normalized) return false;
  return OBJECTIONABLE_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function filterWhispersByBlockedUsers(
  messages: WhisperMessage[],
  blockedUserIds: Set<string>
): WhisperMessage[] {
  if (!blockedUserIds || blockedUserIds.size === 0) return messages;
  return messages.filter(
    (m) => !blockedUserIds.has(m.sender_id) && !blockedUserIds.has(m.receiver_id)
  );
}

export function formatWhisperSendError(rawMessage?: string | null): string {
  const msg = (rawMessage || '').toLowerCase();
  if (msg.includes('row-level security') || msg.includes('policy') || msg.includes('permission denied')) {
    return 'Invio bloccato: verifica i permessi nella campagna o che non ci sia un blocco attivo tra gli account.';
  }
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('timeout')) {
    return 'Errore di rete durante l’invio del sussurro. Il testo è stato conservato: riprova.';
  }
  return rawMessage?.trim() || 'Impossibile inviare il sussurro. Il testo è stato conservato: riprova.';
}
