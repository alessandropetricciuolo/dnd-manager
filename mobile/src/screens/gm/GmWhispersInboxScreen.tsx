import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  Lock,
  Send,
  Users,
  Radio,
  Eye,
  CheckCheck,
  Shield,
  Sparkles,
  RefreshCw,
  Volume2,
  Crown,
  Flag,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useAuth } from '../../contexts/AuthContext';
import { useGmCampaigns } from '../../hooks/useGmCampaigns';
import { useRealtimeWhispers } from '../../hooks/useRealtimeWhispers';
import { Character, WhisperMessage } from '../../types';
import { blockWhisperUser, reportWhisper } from '../../api/whisperSafety';

interface PlayerTarget {
  id: string;
  charName: string;
  playerName: string;
  charClass?: string;
  isBroadcast?: boolean;
}

const GM_QUICK_PRESETS = [
  'Fai un tiro di Furtività CD 15',
  'Nessuno al tavolo se ne accorge...',
  'Senti una presenza misteriosa',
  'Richiesta approvata',
  'Tira 1d20 puro',
  'Fai una prova di Percezione Passiva',
  'Subisci 1d6 danni psichici silenziosi',
];

export const GmWhispersInboxScreen: React.FC = () => {
  const { user } = useAuth();
  const { activeCampaign, characters } = useGmCampaigns();
  const currentGmId = user?.id || '';

  const activeCampaignId = activeCampaign?.id || '';

  // Build target list of players from active campaign characters
  const playerTargets = useMemo<PlayerTarget[]>(() => {
    const list: PlayerTarget[] = [
      {
        id: 'all-party',
        charName: 'Tutti al Tavolo',
        playerName: 'Broadcast Segreto',
        charClass: 'Tutti gli Eroi',
        isBroadcast: true,
      },
    ];

    if (characters && characters.length > 0) {
      characters.forEach((c: Character) => {
        const targetId = c.assigned_to || c.id;
        list.push({
          id: targetId,
          charName: c.name,
          playerName: c.assigned_to ? 'Giocatore Assegnato' : 'PG Non Assegnato',
          charClass: c.character_class
            ? `${c.character_class}${c.level ? ` Lv.${c.level}` : ''}`
            : 'Eroe',
        });
      });
    }

    return list;
  }, [characters]);

  // Selected player ID in tabs
  const [selectedTargetId, setSelectedTargetId] = useState<string>('all-party');
  const [replyText, setReplyText] = useState('');
  const scrollViewRef = useRef<any>(null);

  // Hook for whispers
  const {
    allMessages,
    unreadCountByPlayer,
    unreadCount,
    sendWhisper,
    markAsRead,
    isLoading,
    isSending,
    refreshMessages,
  } = useRealtimeWhispers({
    campaignId: activeCampaignId,
    autoMarkRead: false,
  });

  // Ensure selectedTargetId is valid
  useEffect(() => {
    if (playerTargets.length > 0 && !playerTargets.some((p) => p.id === selectedTargetId)) {
      setSelectedTargetId(playerTargets[0].id);
    }
  }, [playerTargets, selectedTargetId]);

  // Mark as read when active target changes
  useEffect(() => {
    if (selectedTargetId && selectedTargetId !== 'all-party') {
      markAsRead(selectedTargetId);
    }
  }, [selectedTargetId, markAsRead]);

  // Selected target object
  const activeTarget = useMemo(() => {
    return playerTargets.find((p) => p.id === selectedTargetId) || playerTargets[1] || playerTargets[0];
  }, [playerTargets, selectedTargetId]);

  // Filter messages for current view
  const currentConversationMessages = useMemo(() => {
    if (selectedTargetId === 'all-party') {
      return allMessages;
    }
    return allMessages.filter(
      (m) =>
        (m.sender_id === currentGmId && m.receiver_id === selectedTargetId) ||
        (m.sender_id === selectedTargetId && m.receiver_id === currentGmId)
    );
  }, [allMessages, currentGmId, selectedTargetId]);

  // Auto-scroll on messages change
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 120);
    return () => clearTimeout(timer);
  }, [currentConversationMessages.length]);

  // Send reply or broadcast
  const handleSend = useCallback(async () => {
    if (!replyText.trim() || isSending) return;
    const textToSend = replyText.trim();
    setReplyText('');

    if (activeTarget.isBroadcast) {
      // Broadcast to every individual player in party
      const realTargets = playerTargets.filter((p) => !p.isBroadcast);
      for (const target of realTargets) {
        await sendWhisper(activeCampaignId, target.id, `[TAVOLO] ${textToSend}`);
      }
    } else {
      await sendWhisper(activeCampaignId, activeTarget.id, textToSend);
    }

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [replyText, isSending, activeTarget, playerTargets, sendWhisper, activeCampaignId]);

  const handleApplyPreset = (presetText: string) => {
    setReplyText(presetText);
  };

  const handleWhisperSafety = (message: WhisperMessage) => {
    const otherUserId = message.sender_id;
    if (!currentGmId || !otherUserId || otherUserId === currentGmId) return;
    Alert.alert('Sussurro', 'Come vuoi procedere?', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Segnala', onPress: () => {
        void reportWhisper({
          reporterId: currentGmId,
          reportedUserId: otherUserId,
          whisperId: message.id,
          campaignId: message.campaign_id,
        }).then(() => Alert.alert('Segnalazione inviata', 'Il team potrà esaminare il messaggio segnalato.'))
          .catch(() => Alert.alert('Invio non riuscito', 'Non siamo riusciti a inviare la segnalazione. Riprova.'));
      } },
      { text: 'Blocca', style: 'destructive', onPress: () => {
        Alert.alert('Bloccare questo account?', 'I nuovi sussurri tra voi verranno impediti.', [
          { text: 'Annulla', style: 'cancel' },
          { text: 'Blocca account', style: 'destructive', onPress: () => {
            void blockWhisperUser(currentGmId, otherUserId)
              .then(() => Alert.alert('Account bloccato', 'Non potrai più inviare o ricevere sussurri da questo account.'))
              .catch(() => Alert.alert('Blocco non riuscito', 'Non siamo riusciti a bloccare l’account. Riprova.'));
          } },
        ]);
      } },
    ]);
  };

  const formatMessageTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Helper to get sender label in conversation
  const getSenderLabel = (msg: WhisperMessage) => {
    if (msg.sender_id === currentGmId) {
      return 'Tu (Game Master)';
    }
    const found = playerTargets.find((p) => p.id === msg.sender_id);
    return found ? `${found.charName} (${found.playerName})` : 'Avventuriero';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        {/* Campaign Info Bar */}
        <View style={styles.campaignBar}>
          <Crown size={14} color={colors.brassLight} />
          <Text style={styles.campaignBarText} numberOfLines={1}>
            {activeCampaign?.name || 'Campagna Attiva'} • Sussurri Segreti Regia
          </Text>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={refreshMessages}
            activeOpacity={0.7}
          >
            <RefreshCw size={12} color={colors.parchmentMuted} />
          </TouchableOpacity>
        </View>

        {/* Tab or Selettore Orizzontale dei Giocatori della Campagna */}
        <View style={styles.playersTabBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.playersTabScroll}
          >
            {playerTargets.map((target) => {
              const isSelected = target.id === selectedTargetId;
              const unread = target.isBroadcast
                ? unreadCount
                : unreadCountByPlayer[target.id] || 0;

              return (
                <TouchableOpacity
                  key={target.id}
                  style={[
                    styles.playerTab,
                    isSelected && styles.playerTabActive,
                    target.isBroadcast && styles.playerTabBroadcast,
                  ]}
                  onPress={() => setSelectedTargetId(target.id)}
                  activeOpacity={0.8}
                >
                  {target.isBroadcast ? (
                    <Users
                      size={14}
                      color={isSelected ? colors.void : colors.brassLight}
                      style={styles.tabIcon}
                    />
                  ) : (
                    <Shield
                      size={13}
                      color={isSelected ? colors.void : colors.parchmentMuted}
                      style={styles.tabIcon}
                    />
                  )}

                  <View>
                    <Text
                      style={[
                        styles.playerTabChar,
                        isSelected && styles.playerTabCharActive,
                      ]}
                      numberOfLines={1}
                    >
                      {target.charName.split(' ')[0]}
                    </Text>
                    {target.charClass && !target.isBroadcast && (
                      <Text
                        style={[
                          styles.playerTabClass,
                          isSelected && styles.playerTabClassActive,
                        ]}
                        numberOfLines={1}
                      >
                        {target.charClass}
                      </Text>
                    )}
                  </View>

                  {/* Badge non letti rosso/oro numerato */}
                  {unread > 0 && (
                    <View
                      style={[
                        styles.unreadBadge,
                        target.isBroadcast && styles.unreadBadgeBroadcast,
                      ]}
                    >
                      <Text style={styles.unreadBadgeText}>
                        {unread > 9 ? '9+' : unread}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Selected Player Info Bar */}
        <View style={styles.chatHeader}>
          <View style={styles.chatHeaderLeft}>
            <Lock size={13} color={colors.brassLight} />
            <Text style={styles.chatPlayerTitle} numberOfLines={1}>
              {activeTarget.isBroadcast
                ? 'BROADCAST SEGRETO • TUTTI GLI AVVENTURIERI'
                : `${activeTarget.charName} • ${activeTarget.playerName}`}
            </Text>
          </View>
          <View style={styles.encryptedTag}>
            <Text style={styles.encryptedText}>
              {activeTarget.isBroadcast ? 'MULTICAST' : 'CANALE SEGRETO'}
            </Text>
          </View>
        </View>

        {/* Conversation Stream */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
        >
          {isLoading && currentConversationMessages.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.brassBase} />
              <Text style={styles.loadingText}>Recupero sussurri cifrati...</Text>
            </View>
          ) : currentConversationMessages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Eye size={28} color={colors.stoneBorder} />
              <Text style={styles.emptyTitle}>
                Nessun messaggio con {activeTarget.charName}
              </Text>
              <Text style={styles.emptyDesc}>
                Invia un sussurro riservato a questo avventuriero usando il campo
                qui sotto o i preset rapidi del Master.
              </Text>
            </View>
          ) : (
            currentConversationMessages.map((msg) => {
              const isGm = msg.sender_id === currentGmId;
              const isOptimistic = msg.id.startsWith('optimistic-');

              return (
                <View
                  key={msg.id}
                  style={[
                    styles.msgRow,
                    isGm ? styles.msgRowGm : styles.msgRowPlayer,
                  ]}
                >
                  <View
                    style={[
                      styles.msgBubble,
                      isGm ? styles.msgBubbleGm : styles.msgBubblePlayer,
                    ]}
                  >
                    <View style={styles.msgBubbleHeader}>
                      <Text
                        style={[
                          styles.msgSender,
                          isGm ? styles.senderGm : styles.senderPlayer,
                        ]}
                      >
                        {getSenderLabel(msg)}
                      </Text>
                      {isOptimistic && (
                        <Text style={styles.optimisticText}>Invio...</Text>
                      )}
                    </View>
                    <Text style={styles.msgText}>{msg.message}</Text>
                    {!isGm && !isOptimistic ? (
                      <TouchableOpacity
                        style={styles.safetyAction}
                        onPress={() => handleWhisperSafety(msg)}
                        accessibilityRole="button"
                        accessibilityLabel="Segnala o blocca questo account"
                      >
                        <Flag size={12} color={colors.parchmentMuted} />
                        <Text style={styles.safetyActionText}>Segnala o blocca</Text>
                      </TouchableOpacity>
                    ) : null}
                    <View style={styles.msgFooter}>
                      <Text style={styles.msgTime}>
                        {formatMessageTime(msg.created_at)}
                      </Text>
                      {isGm && (
                        <CheckCheck size={11} color={colors.brassLight} style={styles.checkIcon} />
                      )}
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Preset Rapidi di Risposta del Master */}
        <View style={styles.quickReplyRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickReplyScroll}
          >
            {GM_QUICK_PRESETS.map((tmpl, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.templateChip}
                onPress={() => handleApplyPreset(tmpl)}
                activeOpacity={0.75}
              >
                <Sparkles size={11} color={colors.brassLight} style={styles.presetIcon} />
                <Text style={styles.templateText}>{tmpl}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            placeholder={
              activeTarget.isBroadcast
                ? 'Sussurra segretamente a TUTTO il tavolo...'
                : `Rispondi a ${activeTarget.charName.split(' ')[0]}...`
            }
            placeholderTextColor={colors.parchmentMuted}
            value={replyText}
            onChangeText={setReplyText}
            multiline
            maxLength={600}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!replyText.trim() || isSending) && styles.sendBtnDisabled,
            ]}
            onPress={handleSend}
            disabled={!replyText.trim() || isSending}
            activeOpacity={0.8}
          >
            {isSending ? (
              <ActivityIndicator size="small" color={colors.void} />
            ) : (
              <Send
                size={18}
                color={replyText.trim() ? colors.void : colors.stoneBorder}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.void,
  },
  keyboardAvoid: {
    flex: 1,
  },
  campaignBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.stoneSurface,
    borderBottomWidth: 1,
    borderBottomColor: colors.stoneBorder,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 8,
  },
  campaignBarText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: colors.parchmentLight,
  },
  refreshBtn: {
    padding: 4,
  },
  playersTabBar: {
    backgroundColor: colors.stone,
    borderBottomWidth: 1,
    borderBottomColor: colors.stoneBorder,
    paddingVertical: 8,
  },
  playersTabScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  playerTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 8,
  },
  playerTabBroadcast: {
    borderColor: colors.brassDark,
  },
  playerTabActive: {
    backgroundColor: colors.brassBase,
    borderColor: colors.brassLight,
  },
  tabIcon: {
    marginRight: 1,
  },
  playerTabChar: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.parchmentLight,
  },
  playerTabCharActive: {
    color: colors.void,
    fontWeight: '800',
  },
  playerTabClass: {
    fontSize: 9,
    color: colors.parchmentMuted,
  },
  playerTabClassActive: {
    color: colors.void,
    opacity: 0.85,
  },
  unreadBadge: {
    backgroundColor: colors.crimson,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 3,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeBroadcast: {
    backgroundColor: colors.brassDark,
  },
  unreadBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: colors.parchmentLight,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.stoneSurface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.stoneBorder,
  },
  chatHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  chatPlayerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brassLight,
    flex: 1,
  },
  encryptedTag: {
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.brassDark,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  encryptedText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.brassLight,
    letterSpacing: 0.4,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 24,
    gap: 12,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: colors.parchmentMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.parchmentLight,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 12,
    color: colors.parchmentMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  msgRow: {
    flexDirection: 'row',
  },
  msgRowGm: {
    justifyContent: 'flex-end',
  },
  msgRowPlayer: {
    justifyContent: 'flex-start',
  },
  msgBubble: {
    maxWidth: '82%',
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  msgBubbleGm: {
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.brassDark,
    borderBottomRightRadius: 2,
  },
  msgBubblePlayer: {
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    borderBottomLeftRadius: 2,
  },
  msgBubbleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  msgSender: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  senderGm: {
    color: colors.brassLight,
  },
  senderPlayer: {
    color: colors.parchmentLight,
  },
  optimisticText: {
    fontSize: 9,
    color: colors.brassDark,
    fontStyle: 'italic',
  },
  msgText: {
    fontSize: 13.5,
    color: colors.parchmentLight,
    lineHeight: 19,
  },
  safetyAction: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingTop: 8, alignSelf: 'flex-start' },
  safetyActionText: { color: colors.parchmentMuted, fontSize: 10, textDecorationLine: 'underline' },
  msgFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 5,
  },
  msgTime: {
    fontSize: 9,
    color: colors.parchmentMuted,
  },
  checkIcon: {
    marginLeft: 2,
  },
  quickReplyRow: {
    backgroundColor: colors.stone,
    borderTopWidth: 1,
    borderTopColor: colors.stoneBorder,
    paddingVertical: 8,
  },
  quickReplyScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  templateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.brassDark,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  presetIcon: {
    marginRight: 4,
  },
  templateText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.parchmentLight,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: colors.stoneSurface,
    borderTopWidth: 1,
    borderTopColor: colors.stoneBorder,
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.stone,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 13,
    color: colors.parchmentLight,
    maxHeight: 90,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.brassBase,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.brassBase,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendBtnDisabled: {
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    shadowOpacity: 0,
    elevation: 0,
  },
});

export default GmWhispersInboxScreen;
