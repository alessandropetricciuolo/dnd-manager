import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../api/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useCampaign } from '../contexts/CampaignContext';
import { WhisperMessage, PlayerConversationSummary } from '../types';
import {
  containsObjectionableContent,
  filterWhispersByBlockedUsers,
  formatWhisperSendError,
  reconcileConfirmedWhisper,
  reconcileRealtimeWhisper,
  removeOptimisticWhisper,
} from '../lib/whisper-state';
import { listBlockedWhisperUsers } from '../api/whisperSafety';
import { WHISPER_RULES_REQUIRED } from '../lib/whisper-rules';

export interface UseRealtimeWhispersOptions {
  campaignId?: string | null;
  partnerId?: string | null;
  autoMarkRead?: boolean;
}

export interface SendWhisperResult {
  success: boolean;
  message?: WhisperMessage;
  error?: string;
  requiresRules?: boolean;
}

export interface UseRealtimeWhispersReturn {
  messages: WhisperMessage[];
  allMessages: WhisperMessage[];
  unreadCount: number;
  unreadCountByPlayer: Record<string, number>;
  conversationsByPlayer: Record<string, PlayerConversationSummary>;
  conversationsList: PlayerConversationSummary[];
  activePartnerId: string | null;
  setActivePartnerId: (partnerId: string | null) => void;
  sendWhisper: (campaignId: string, receiverId: string, text: string) => Promise<SendWhisperResult>;
  markAsRead: (senderId?: string) => void;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  refreshMessages: () => Promise<void>;
  refreshBlockedUsers: () => Promise<void>;
}

export function useRealtimeWhispers(options?: UseRealtimeWhispersOptions): UseRealtimeWhispersReturn {
  const { user } = useAuth();
  const { activeCampaignId } = useCampaign();
  const currentUserId = user?.id || '';

  const campaignId = options?.campaignId !== undefined ? options.campaignId : activeCampaignId;
  const initialPartnerId = options?.partnerId ?? null;
  const autoMarkRead = options?.autoMarkRead ?? false;

  const [activePartnerId, setActivePartnerId] = useState<string | null>(initialPartnerId);
  const [rawMessages, setRawMessages] = useState<WhisperMessage[]>([]);
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(() => new Set<string>());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refreshBlockedUsers = useCallback(async () => {
    if (!currentUserId) {
      setBlockedUserIds(new Set());
      return;
    }
    try {
      const rows = await listBlockedWhisperUsers(currentUserId);
      setBlockedUserIds(new Set(rows.map((r) => r.blocked_id).filter(Boolean)));
    } catch {
      // Keep previous blocklist if transient error occurs
    }
  }, [currentUserId]);

  useEffect(() => {
    void refreshBlockedUsers();
  }, [refreshBlockedUsers]);

  const allMessages = useMemo(
    () =>
      filterWhispersByBlockedUsers(rawMessages, blockedUserIds).filter(
        (m) => !containsObjectionableContent(m.message || '')
      ),
    [rawMessages, blockedUserIds]
  );

  // Set of message IDs that have been read by current user
  const [readMessageIds, setReadMessageIds] = useState<Set<string>>(() => new Set<string>());

  // Sync activePartnerId if initialPartnerId changes
  useEffect(() => {
    if (initialPartnerId !== undefined) {
      setActivePartnerId(initialPartnerId);
    }
  }, [initialPartnerId]);

  // Load whispers from Supabase for the campaign
  const fetchMessages = useCallback(async () => {
    if (!currentUserId || !campaignId) {
      setRawMessages([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await refreshBlockedUsers();
      const { data, error: dbErr } = await supabase
        .from('secret_whispers')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: true });

      if (dbErr) {
        console.warn('[useRealtimeWhispers] Supabase query error:', dbErr.message);
        setError(dbErr.message);
        setRawMessages([]);
      } else {
        setRawMessages((data as WhisperMessage[]) || []);
      }
    } catch (err: any) {
      console.warn('[useRealtimeWhispers] fetchMessages exception:', err);
      setError(err?.message || 'Errore di connessione');
      setRawMessages([]);
    } finally {
      setIsLoading(false);
    }
  }, [campaignId, currentUserId, refreshBlockedUsers]);

  // Initial fetch on mount or campaign change
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Realtime subscription using Supabase channel as requested
  useEffect(() => {
    const channel = supabase
      .channel('public:secret_whispers')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'secret_whispers',
        },
        (payload) => {
          const newRow = payload.new as WhisperMessage;
          if (!newRow || !newRow.id) return;

          // If campaignId is specified, ignore whispers from other campaigns
          if (campaignId && newRow.campaign_id !== campaignId) {
            return;
          }

          setRawMessages((prev) => reconcileRealtimeWhisper(prev, newRow));

          // Auto-mark as read if current user is active partner with the sender
          if (
            autoMarkRead &&
            activePartnerId &&
            newRow.sender_id === activePartnerId &&
            newRow.receiver_id === currentUserId
          ) {
            setReadMessageIds((prevSet) => new Set(prevSet).add(newRow.id));
          }
        }
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'secret_whispers' }, (payload) => {
        const removedId = payload.old.id;
        if (removedId) setRawMessages((prev) => prev.filter((message) => message.id !== removedId));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId, activePartnerId, currentUserId, autoMarkRead]);

  // Send whisper with real persistence check and rollback on failure
  const sendWhisper = useCallback(
    async (targetCampaignId: string, receiverId: string, text: string): Promise<SendWhisperResult> => {
      const cleanText = text.trim();
      if (!cleanText) {
        return { success: false, error: 'Il testo del messaggio non può essere vuoto.' };
      }

      const activeTargetCampaignId = (targetCampaignId || campaignId || '').trim();
      if (!currentUserId) {
        return { success: false, error: 'Sessione non autenticata. Accedi nuovamente per inviare un sussurro.' };
      }
      if (!activeTargetCampaignId) {
        return { success: false, error: 'Seleziona prima una campagna valida per inviare un sussurro.' };
      }
      if (!receiverId || !receiverId.trim()) {
        return { success: false, error: 'Destinatario non valido o non ancora assegnato per questa campagna.' };
      }
      if (containsObjectionableContent(cleanText)) {
        return {
          success: false,
          error: 'Il messaggio contiene termini non consentiti dalle linee guida della community. Modifica il testo per inviare.',
        };
      }

      const optimisticId = `optimistic-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      const optimisticMsg: WhisperMessage = {
        id: optimisticId,
        campaign_id: activeTargetCampaignId,
        sender_id: currentUserId,
        receiver_id: receiverId,
        message: cleanText,
        image_url: null,
        created_at: new Date().toISOString(),
      };

      // 1. Optimistic local state update
      setRawMessages((prev) => [...prev, optimisticMsg]);
      setIsSending(true);
      setError(null);

      try {
        // 2. Perform Supabase database insert
        const { data, error: insertErr } = await supabase
          .from('secret_whispers')
          .insert({
            campaign_id: activeTargetCampaignId,
            sender_id: currentUserId,
            receiver_id: receiverId,
            message: cleanText,
          })
          .select('*')
          .single();

        if (insertErr || !data) {
          setRawMessages((prev) => removeOptimisticWhisper(prev, optimisticId));
          if (insertErr?.code === WHISPER_RULES_REQUIRED) {
            return { success: false, requiresRules: true };
          }
          const readableError = formatWhisperSendError(insertErr?.message);
          console.warn('[useRealtimeWhispers] Supabase insert failed:', insertErr?.message);
          setError(readableError);
          return { success: false, error: readableError };
        }

        const confirmedMsg = data as WhisperMessage;

        // 3. Reconcile optimistic message with confirmed row (deduplicated against Realtime)
        setRawMessages((prev) => reconcileConfirmedWhisper(prev, optimisticId, confirmedMsg));

        return { success: true, message: confirmedMsg };
      } catch (err: any) {
        const readableError = formatWhisperSendError(err?.message);
        console.warn('[useRealtimeWhispers] sendWhisper exception:', err);
        setRawMessages((prev) => removeOptimisticWhisper(prev, optimisticId));
        setError(readableError);
        return { success: false, error: readableError };
      } finally {
        setIsSending(false);
      }
    },
    [campaignId, currentUserId]
  );

  // Mark messages from a specific sender (or all) as read
  const markAsRead = useCallback(
    (senderId?: string) => {
      setReadMessageIds((prev) => {
        const next = new Set(prev);
        allMessages.forEach((msg) => {
          if (msg.receiver_id === currentUserId) {
            if (!senderId || msg.sender_id === senderId) {
              next.add(msg.id);
            }
          }
        });
        return next;
      });
    },
    [allMessages, currentUserId]
  );

  // Auto mark as read when viewing activePartnerId
  useEffect(() => {
    if (activePartnerId) {
      markAsRead(activePartnerId);
    }
  }, [activePartnerId, markAsRead]);

  // Filter messages for current active conversation (if activePartnerId is set)
  const messages = useMemo(() => {
    if (!activePartnerId) {
      return allMessages;
    }
    return allMessages.filter(
      (m) =>
        (m.sender_id === currentUserId && m.receiver_id === activePartnerId) ||
        (m.sender_id === activePartnerId && m.receiver_id === currentUserId)
    );
  }, [allMessages, activePartnerId, currentUserId]);

  // Calculate unread count for current user
  const unreadCount = useMemo(() => {
    return allMessages.filter(
      (m) => m.receiver_id === currentUserId && !readMessageIds.has(m.id)
    ).length;
  }, [allMessages, currentUserId, readMessageIds]);

  // Unread count mapped per sender/player
  const unreadCountByPlayer = useMemo(() => {
    const map: Record<string, number> = {};
    allMessages.forEach((m) => {
      if (m.receiver_id === currentUserId && !readMessageIds.has(m.id)) {
        map[m.sender_id] = (map[m.sender_id] || 0) + 1;
      }
    });
    return map;
  }, [allMessages, currentUserId, readMessageIds]);

  // Build conversations map for GM / overview
  const conversationsByPlayer = useMemo(() => {
    const map: Record<string, PlayerConversationSummary> = {};

    allMessages.forEach((m) => {
      // The other participant in the conversation
      const otherId = m.sender_id === currentUserId ? m.receiver_id : m.sender_id;

      if (!map[otherId]) {
        map[otherId] = {
          playerId: otherId,
          playerName: otherId ? `Avventuriero (${otherId.slice(0, 5)})` : 'Avventuriero',
          characterName: 'Eroe di Gilda',
          lastMessage: m,
          unreadCount: 0,
          messages: [],
          updatedAt: m.created_at,
        };
      }

      map[otherId].messages.push(m);

      // Check if this message is newer
      if (new Date(m.created_at) > new Date(map[otherId].updatedAt)) {
        map[otherId].lastMessage = m;
        map[otherId].updatedAt = m.created_at;
      }

      // Check unread
      if (m.receiver_id === currentUserId && !readMessageIds.has(m.id)) {
        map[otherId].unreadCount += 1;
      }
    });

    return map;
  }, [allMessages, currentUserId, readMessageIds]);

  // List of conversations ordered by last message timestamp (most recent first)
  const conversationsList = useMemo(() => {
    return Object.values(conversationsByPlayer).sort((a, b) => {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [conversationsByPlayer]);

  return {
    messages,
    allMessages,
    unreadCount,
    unreadCountByPlayer,
    conversationsByPlayer,
    conversationsList,
    activePartnerId,
    setActivePartnerId,
    sendWhisper,
    markAsRead,
    isLoading,
    isSending,
    error,
    refreshMessages: fetchMessages,
    refreshBlockedUsers,
  };
}

export default useRealtimeWhispers;
