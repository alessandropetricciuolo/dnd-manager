import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { ExpoSecureStoreAdapter } from '../api/supabase';
import { useGmCampaigns } from '../hooks/useGmCampaigns';
import { ParsedGmRemoteQr } from '../utils/qrParser';

const STORAGE_KEY_PAIRING = 'gm_audio_remote_pairing';
const DEFAULT_WEB_BASE = 'https://www.barberanddragons.com';

export interface GmLiveEntry {
  id: string;
  name: string;
  type: string;
  hp: number;
  maxHp: number;
  initiative: number;
  damageDealt: number;
  damageTaken: number;
  ac?: number | null;
  conditions?: string[];
}

export interface GmLiveSnapshot {
  entries: GmLiveEntry[];
  controlsReady?: boolean;
  matchId?: string | null;
  sessionId?: string | null;
  sessionTitle?: string | null;
  roundNumber: number;
  currentTurnIndex: number;
  isTurnTimerRunning: boolean;
  turnElapsedSeconds: number;
  updatedAt: string;
  stateSignature?: string;
  combatCommand?: {
    requestId: string;
    proposalId?: string;
    status: 'awaiting' | 'proposal' | 'applied' | 'rejected';
    campaignId: string;
    remoteSessionPublicId: string;
    sessionId: string;
    matchId: string | null;
    stateSignature: string;
    message?: string;
    rawInput?: string;
    proposal?: {
      operations: Array<{
        id: string;
        kind: string;
        targetName?: string;
        targetIds?: string[];
        casterName?: string;
        spellName?: string;
        sourceName?: string;
        sourceLabel?: string;
        amount?: number;
        exactHp?: number;
        label?: string;
      }>;
      unresolvedTargets: Array<{ query: string; reason: string; candidates?: Array<{ id: string; name: string }> }>;
      missingData: Array<{ field: string; message: string }>;
    };
    receipt?: { appliedAt: string; stateSignature: string };
  } | null;
}

export type GmLiveStatus = 'unpaired' | 'checking' | 'online' | 'offline' | 'expired' | 'mismatch';

interface Pairing {
  publicId: string;
  token: string;
  baseUrl: string;
}

interface GmLiveContextValue {
  pairing: Pairing | null;
  status: GmLiveStatus;
  snapshot: GmLiveSnapshot | null;
  controlsReady: boolean | null;
  campaignId: string | null;
  expiresAt: string | null;
  error: string | null;
  isValidating: boolean;
  pair: (value: ParsedGmRemoteQr) => Promise<boolean>;
  disconnect: () => Promise<void>;
  setSnapshotConsumer: (consumer: string, active: boolean) => void;
  sendCommand: (type: string, payload?: Record<string, unknown>, commandId?: string) => Promise<{ ok: boolean; error?: string }>;
  refresh: () => Promise<void>;
}

const GmLiveContext = createContext<GmLiveContextValue | undefined>(undefined);

function makeCommandId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function parseSnapshot(value: unknown): GmLiveSnapshot | null {
  if (!value || typeof value !== 'object') return null;
  const snapshot = value as Partial<GmLiveSnapshot>;
  if (!Array.isArray(snapshot.entries) || typeof snapshot.updatedAt !== 'string') return null;
  if (!Number.isFinite(snapshot.roundNumber) || !Number.isFinite(snapshot.currentTurnIndex)) return null;
  return snapshot as GmLiveSnapshot;
}

export const GmLiveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeCampaign } = useGmCampaigns();
  const [pairing, setPairing] = useState<Pairing | null>(null);
  const [status, setStatus] = useState<GmLiveStatus>('unpaired');
  const [snapshot, setSnapshot] = useState<GmLiveSnapshot | null>(null);
  const [controlsReady, setControlsReady] = useState<boolean | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [consumers, setConsumers] = useState<Record<string, boolean>>({});
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const pairingRef = useRef<Pairing | null>(null);
  const campaignRef = useRef<string | null>(activeCampaign?.id ?? null);
  const validationSequence = useRef(0);
  const rateLimitedUntil = useRef(0);
  const storageWriteQueue = useRef<Promise<void>>(Promise.resolve());
  campaignRef.current = activeCampaign?.id ?? null;

  const enqueueStorageWrite = useCallback((write: () => Promise<void>) => {
    const queued = storageWriteQueue.current.catch(() => undefined).then(write);
    storageWriteQueue.current = queued;
    return queued;
  }, []);

  const applyResponse = useCallback((data: any) => {
    const returnedCampaignId = typeof data?.campaignId === 'string' ? data.campaignId : null;
    const nextSnapshot = parseSnapshot(data?.snapshot);
    setCampaignId(returnedCampaignId);
    setExpiresAt(typeof data?.expiresAt === 'string' ? data.expiresAt : null);
    setSnapshot(nextSnapshot);
    setControlsReady(typeof data?.controlsReady === 'boolean' ? data.controlsReady : typeof data?.snapshot?.controlsReady === 'boolean' ? data.snapshot.controlsReady : null);
    if (returnedCampaignId && activeCampaign?.id && returnedCampaignId !== activeCampaign.id) {
      setStatus('mismatch');
      setError('La live appartiene a una campagna diversa da quella selezionata.');
      return;
    }
    setError(null);
    setStatus(data?.pcOnline === true ? 'online' : 'offline');
  }, [activeCampaign?.id]);

  const validate = useCallback(async (value: Pairing, persist = false, silent = false): Promise<boolean> => {
    const requestId = ++validationSequence.current;
    const requestedCampaignId = activeCampaign?.id ?? null;
    setIsValidating(true);
    if (!silent) {
      setStatus('checking');
      setError(null);
    }
    try {
      const response = await fetch(
        `${value.baseUrl.replace(/\/+$/, '')}/api/gm-remote/${encodeURIComponent(value.publicId)}/initiative-state`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: value.token }),
          signal: AbortSignal.timeout(12000),
        }
      );
      const data = await response.json().catch(() => ({}));
      if (
        requestId !== validationSequence.current ||
        campaignRef.current !== requestedCampaignId ||
        pairingRef.current?.publicId !== value.publicId ||
        pairingRef.current?.token !== value.token
      ) return false;
      if (!response.ok || !data?.ok) {
        const code = typeof data?.error === 'string' ? data.error : `HTTP ${response.status}`;
        if (response.status === 429) {
          const retryAfter = Number.parseInt(response.headers.get('Retry-After') || '', 10);
          rateLimitedUntil.current = Date.now() + Math.max(3000, Number.isFinite(retryAfter) ? retryAfter * 1000 : 3000);
          setStatus('offline');
          setError('Troppe richieste. Aggiorno di nuovo tra pochi secondi.');
          return false;
        }
        if (code === 'session_expired' || code === 'session_revoked' || code === 'invalid_token') {
          setStatus('expired');
          setError('Sessione scaduta o token non valido. Scansiona un nuovo QR.');
        } else {
          setStatus('offline');
          setError(code);
        }
        return false;
      }
      const returnedCampaignId = typeof data.campaignId === 'string' ? data.campaignId : null;
      if (!requestedCampaignId || !returnedCampaignId || returnedCampaignId !== requestedCampaignId) {
        setCampaignId(returnedCampaignId);
        setExpiresAt(typeof data.expiresAt === 'string' ? data.expiresAt : null);
        setStatus('mismatch');
        setError('La live appartiene a una campagna diversa da quella selezionata.');
        return false;
      }
      if (persist) {
        await enqueueStorageWrite(() => ExpoSecureStoreAdapter.setItem(STORAGE_KEY_PAIRING, JSON.stringify(value)));
        if (
          requestId !== validationSequence.current ||
          campaignRef.current !== requestedCampaignId ||
          pairingRef.current?.publicId !== value.publicId ||
          pairingRef.current?.token !== value.token
        ) return false;
        setPairing(value);
      }
      if (
        requestId !== validationSequence.current ||
        campaignRef.current !== requestedCampaignId ||
        pairingRef.current?.publicId !== value.publicId ||
        pairingRef.current?.token !== value.token
      ) return false;
      applyResponse(data);
      return true;
    } catch (cause: any) {
      if (requestId !== validationSequence.current || campaignRef.current !== requestedCampaignId) return false;
      setStatus('offline');
      setError(cause?.message || 'Impossibile raggiungere il GM Screen.');
      return false;
    } finally {
      if (requestId === validationSequence.current) setIsValidating(false);
    }
  }, [activeCampaign?.id, applyResponse, enqueueStorageWrite]);

  const validateRef = useRef(validate);
  validateRef.current = validate;

  useEffect(() => {
    let active = true;
    const hydrationSequence = validationSequence.current;
    void (async () => {
      try {
        const raw = await ExpoSecureStoreAdapter.getItem(STORAGE_KEY_PAIRING);
        if (!active || validationSequence.current !== hydrationSequence) return;
        if (!raw) { setStatus('unpaired'); return; }
        const saved = JSON.parse(raw) as Partial<Pairing>;
        if (!saved.publicId || !saved.token || !saved.baseUrl) { setStatus('unpaired'); return; }
        const value = saved as Pairing;
        pairingRef.current = value;
        setPairing(value);
        void validateRef.current(value);
      } catch {
        if (active && !pairingRef.current) setStatus('unpaired');
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (pairing) void validate(pairing, false, true);
  }, [activeCampaign?.id]);

  const pair = useCallback(async (value: ParsedGmRemoteQr): Promise<boolean> => {
    if (!value.token) {
      setError('Il QR non contiene il token segreto di collegamento.');
      return false;
    }
    const candidate: Pairing = { publicId: value.publicId, token: value.token, baseUrl: value.baseUrl || DEFAULT_WEB_BASE };
    const previous = pairingRef.current;
    pairingRef.current = candidate;
    setPairing(null);
    setStatus('checking');
    setError(null);
    const paired = await validate(candidate, true);
    if (!paired && pairingRef.current?.publicId === candidate.publicId && pairingRef.current?.token === candidate.token) {
      pairingRef.current = previous;
      setPairing(previous);
      if (previous) void validate(previous, false, true);
      else setStatus('expired');
    }
    return paired;
  }, [validate]);

  const disconnect = useCallback(async () => {
    const disconnectSequence = ++validationSequence.current;
    pairingRef.current = null;
    await enqueueStorageWrite(() => ExpoSecureStoreAdapter.removeItem(STORAGE_KEY_PAIRING));
    if (validationSequence.current !== disconnectSequence || pairingRef.current !== null) return;
    setPairing(null);
    setStatus('unpaired');
    setSnapshot(null);
    setControlsReady(null);
    setCampaignId(null);
    setExpiresAt(null);
    setError(null);
  }, [enqueueStorageWrite]);

  const setSnapshotConsumer = useCallback((consumer: string, active: boolean) => {
    setConsumers((previous) => ({ ...previous, [consumer]: active }));
  }, []);

  const refresh = useCallback(async () => {
    const current = pairingRef.current;
    if (current) await validate(current, false, true);
  }, [validate]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => { appState.current = next; });
    return () => subscription.remove();
  }, []);

  const needsSnapshot = Object.values(consumers).some(Boolean);
  useEffect(() => {
    if (!pairing || !needsSnapshot) return;
    let pending = false;
    if (appState.current === 'active') {
      pending = true;
      setStatus('checking');
      void validate(pairing, false, true).finally(() => { pending = false; });
    }
    const timer = setInterval(() => {
      if (appState.current !== 'active' || pending) return;
      if (Date.now() < rateLimitedUntil.current) return;
      pending = true;
      void validate(pairing, false, true).finally(() => { pending = false; });
    }, 1000);
    return () => clearInterval(timer);
  }, [needsSnapshot, pairing, validate]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      appState.current = next;
      if (next === 'active' && needsSnapshot && pairingRef.current) {
        setStatus('checking');
        void validateRef.current(pairingRef.current, false, true);
      }
    });
    return () => subscription.remove();
  }, [needsSnapshot]);

  const sendCommand = useCallback(async (type: string, payload: Record<string, unknown> = {}, commandId?: string) => {
    const current = pairingRef.current;
    if (!current || !activeCampaign?.id || status !== 'online' || campaignId !== activeCampaign.id || appState.current !== 'active' || Date.now() < rateLimitedUntil.current) {
      return { ok: false, error: error || 'live_not_validated' };
    }
    try {
      const response = await fetch(`${current.baseUrl.replace(/\/+$/, '')}/api/gm-remote/${encodeURIComponent(current.publicId)}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: current.token,
          command_id: commandId ?? makeCommandId(),
          type,
          payload,
          issued_at: new Date().toISOString(),
          source: 'remote',
        }),
        signal: AbortSignal.timeout(12000),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        const code = data?.error || `HTTP ${response.status}`;
        if (response.status === 429) {
          const retryAfter = Number.parseInt(response.headers.get('Retry-After') || '', 10);
          rateLimitedUntil.current = Date.now() + Math.max(3000, Number.isFinite(retryAfter) ? retryAfter * 1000 : 3000);
          setStatus('offline');
          setError('Troppe richieste. Aggiorno di nuovo tra pochi secondi.');
        } else if (code === 'session_expired' || code === 'session_revoked' || code === 'invalid_token') {
          setStatus('expired');
          setError('Sessione scaduta o token non valido. Scansiona un nuovo QR.');
        }
        return { ok: false, error: code };
      }
      return { ok: true };
    } catch (cause: any) {
      return { ok: false, error: cause?.message || 'network_error' };
    }
  }, [activeCampaign?.id, campaignId, error, status]);

  const effectiveStatus: GmLiveStatus = pairing && !activeCampaign?.id
    ? 'checking'
    : campaignId && activeCampaign?.id && campaignId !== activeCampaign.id
      ? 'mismatch'
      : status;

  const value = useMemo<GmLiveContextValue>(() => ({
    pairing, status: effectiveStatus, snapshot, controlsReady, campaignId, expiresAt,
    error: effectiveStatus === 'mismatch' ? 'La live appartiene a una campagna diversa da quella selezionata.' : error,
    isValidating,
    pair, disconnect, setSnapshotConsumer, sendCommand, refresh,
  }), [pairing, effectiveStatus, snapshot, controlsReady, campaignId, expiresAt, error, isValidating, pair, disconnect, setSnapshotConsumer, sendCommand, refresh]);

  return <GmLiveContext.Provider value={value}>{children}</GmLiveContext.Provider>;
};

export function useGmLive(): GmLiveContextValue {
  const context = useContext(GmLiveContext);
  if (!context) throw new Error('useGmLive must be used inside GmLiveProvider');
  return context;
}
