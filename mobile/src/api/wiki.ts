import { supabase } from './supabase';
import { WikiLruCache } from '../lib/wiki-cache';
import type { MobileWikiEntityDetail, MobileWikiIndexPayload } from '../types';

const indexCache = new WikiLruCache<MobileWikiIndexPayload>(24);
const detailCache = new WikiLruCache<MobileWikiEntityDetail>(120);

function getBaseWebUrl(): string {
  return (process.env.EXPO_PUBLIC_WEB_APP_URL || 'https://barberanddragons.com').replace(/\/$/, '');
}

export interface FetchWikiIndexOptions {
  includeAdminOnly?: boolean;
  includeArchived?: boolean;
  includeDocuments?: boolean;
  forceRefresh?: boolean;
}

export interface FetchWikiDetailOptions {
  includeAdminOnly?: boolean;
  expectedUpdatedAt?: string | null;
  forceRefresh?: boolean;
}

export function clearMobileWikiCache(campaignId?: string): void {
  if (!campaignId) {
    indexCache.clear();
    detailCache.clear();
    return;
  }
  indexCache.invalidatePrefix(`${campaignId}:`);
  detailCache.invalidatePrefix(`${campaignId}:`);
}

export async function fetchMobileCampaignWikiIndex(
  campaignId: string,
  options: FetchWikiIndexOptions = {},
): Promise<MobileWikiIndexPayload> {
  if (campaignId.startsWith('demo-')) {
    return {
      campaign: { id: campaignId, name: 'Campagna Demo', type: 'long' },
      viewer: { canReadGmContent: true, isAdmin: false },
      entities: [],
      maps: [],
    };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  const token = session?.access_token;
  const userId = session?.user?.id ?? 'anon';
  if (!token) {
    throw new Error('Sessione scaduta. Effettua nuovamente l’accesso.');
  }

  const cacheKey = [
    campaignId,
    userId,
    options.includeAdminOnly ? 'adm1' : 'adm0',
    options.includeArchived ? 'arc1' : 'arc0',
    options.includeDocuments ? 'doc1' : 'doc0',
  ].join(':');

  if (!options.forceRefresh) {
    const cached = indexCache.get(cacheKey);
    if (cached) return cached;
  }

  const params = new URLSearchParams();
  if (options.includeAdminOnly) params.set('includeAdminOnly', '1');
  if (options.includeArchived) params.set('includeArchived', '1');
  if (options.includeDocuments) params.set('includeDocuments', '1');
  const qs = params.toString();

  const response = await fetch(
    `${getBaseWebUrl()}/api/mobile/campaigns/${encodeURIComponent(campaignId)}/wiki-index${qs ? `?${qs}` : ''}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(15000),
    },
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = typeof payload?.error === 'string' ? payload.error : `HTTP ${response.status}`;
    if (code === 'long_campaign_only') {
      throw new Error('La Wiki per i giocatori è disponibile solo nelle Campagne Long.');
    }
    if (code === 'membership_required') {
      throw new Error('Iscriviti alla campagna per consultare l’archivio Wiki e Mappe.');
    }
    throw new Error('Impossibile sincronizzare l’archivio Wiki. Verifica la connessione e riprova.');
  }

  const normalized = payload as MobileWikiIndexPayload;
  indexCache.set(cacheKey, normalized);
  return normalized;
}

export async function fetchMobileCampaignWikiDetail(
  campaignId: string,
  entityId: string,
  options: FetchWikiDetailOptions = {},
): Promise<MobileWikiEntityDetail> {
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  const token = session?.access_token;
  const userId = session?.user?.id ?? 'anon';
  if (!token) {
    throw new Error('Sessione scaduta. Effettua nuovamente l’accesso.');
  }

  const cacheKey = [
    campaignId,
    userId,
    entityId,
    options.expectedUpdatedAt ?? 'latest',
    options.includeAdminOnly ? 'adm1' : 'adm0',
  ].join(':');

  if (!options.forceRefresh) {
    const cached = detailCache.get(cacheKey);
    if (cached) return cached;
  }

  const params = new URLSearchParams();
  if (options.includeAdminOnly) params.set('includeAdminOnly', '1');
  const qs = params.toString();

  const response = await fetch(
    `${getBaseWebUrl()}/api/mobile/campaigns/${encodeURIComponent(campaignId)}/wiki/${encodeURIComponent(entityId)}${qs ? `?${qs}` : ''}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(15000),
    },
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.entity) {
    throw new Error('Voce Wiki non disponibile o riservata.');
  }

  const entity = payload.entity as MobileWikiEntityDetail;
  detailCache.set(cacheKey, entity);
  return entity;
}
