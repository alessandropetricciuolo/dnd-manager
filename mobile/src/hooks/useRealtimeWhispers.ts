import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../api/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useCampaign } from '../contexts/CampaignContext';
import { WhisperMessage, PlayerConversationSummary } from '../types';

export interface UseRealtimeWhispersOptions {
  campaignId?: string | null;
  partnerId?: string | null;
  autoMarkRead?: boolean;
}

export interface SendWhisperResult {
  success: boolean;
  message?: WhisperMessage;
  error?: string;
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
}

export function useRealtimeWhispers(options?: UseRealtimeWhispersOptions): UseRealtimeWhispersReturn {
  const { user } = useAuth();
  const { activeCampaignId } = useCampaign();
  const currentUserId = user?.id || '';

  const campaignId = options?.campaignId !== undefined ? options.campaignId : activeCampaignId;
  const initialPartnerId = options?.partnerId ?? null;
  const autoMarkRead = options?.autoMarkRead ?? false;

  const [activePartnerId, setActivePartnerId] = useState<string | null>(initialPartnerId);
  const [allMessages, setAllMessages] = useState<WhisperMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('secret_whispers')
        .select('*')
        .order('created_at', { ascending: true });

      if (campaignId) {
        query = query.eq('campaign_id', campaignId);
      }

      const { data, error: dbErr } = await query;

      if (dbErr) {
        console.warn('[useRealtimeWhispers] Supabase query error:', dbErr.message);
        setError(dbErr.message);
        setAllMessages([]);
      } else if (data && data.length > 0) {
        setAllMessages(data as WhisperMessage[]);
      } else {
        setAllMessages([]);
      }
    } catch (err: any) {
      console.warn('[useRealtimeWhispers] fetchMessages exception:', err);
      setError(err?.message || 'Errore di connessione');
      setAllMessages([]);
    } finally {
      setIsLoading(false);
    }
  }, [campaignId]);

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

          setAllMessages((prev) => {
            // Check if already in list (avoid duplicate)
            const exists = prev.some((m) => m.id === newRow.id);
            if (exists) return prev;

            // Check if replaces an optimistic message from the same sender to receiver with same text
            const optimisticIndex = prev.findIndex(
              (m) =>
                m.id.startsWith('optimistic-') &&
                m.sender_id === newRow.sender_id &&
                m.receiver_id === newRow.receiver_id &&
                m.message === newRow.message
            );

            if (optimisticIndex !== -1) {
              const updated = [...prev];
              updated[optimisticIndex] = newRow;
              return updated;
            }

            return [...prev, newRow];
          });

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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId, activePartnerId, currentUserId, autoMarkRead]);

  // Send whisper with optimistic offline fallback
  const sendWhisper = useCallback(
    async (targetCampaignId: string, receiverId: string, text: string): Promise<SendWhisperResult> => {
      const cleanText = text.trim();
      if (!cleanText) {
        return { success: false, error: 'Il testo del messaggio non può essere vuoto.' };
      }

      const activeCampaignId = targetCampaignId || campaignId || '';
      const optimisticId = `optimistic-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      const optimisticMsg: WhisperMessage = {
        id: optimisticId,
        campaign_id: activeCampaignId,
        sender_id: currentUserId,
        receiver_id: receiverId,
        message: cleanText,
        image_url: null,
        created_at: new Date().toISOString(),
      };

      // 1. Optimistic local state update
      setAllMessages((prev) => [...prev, optimisticMsg]);
      setIsSending(true);

      try {
        // 2. Perform Supabase database insert
        const { data, error: insertErr } = await supabase
          .from('secret_whispers')
          .insert({
            campaign_id: activeCampaignId,
            sender_id: currentUserId,
            receiver_id: receiverId,
            message: cleanText,
          })
          .select('*')
          .single();

        if (insertErr) {
          console.warn('[useRealtimeWhispers] Supabase insert failed, keeping optimistic whisper:', insertErr.message);
          // Still keep optimistic message in state so user doesn't lose text
          return { success: true, message: optimisticMsg };
        }

        const confirmedMsg = (data as WhisperMessage) || optimisticMsg;

        // 3. Replace optimistic message with confirmed row
        setAllMessages((prev) =>
          prev.map((m) => (m.id === optimisticId ? confirmedMsg : m))
        );

        return { success: true, message: confirmedMsg };
      } catch (err: any) {
        console.warn('[useRealtimeWhispers] sendWhisper exception, offline optimistic fallback active:', err);
        return { success: true, message: optimisticMsg };
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
  };
}

export default useRealtimeWhispers;
