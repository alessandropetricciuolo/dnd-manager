import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  EyeOff,
  Sparkles,
  ShieldCheck,
  Crown,
  RefreshCw,
  ChevronDown,
  Flag,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useAuth } from '../../contexts/AuthContext';
import { useCampaign } from '../../contexts/CampaignContext';
import { usePlayerCharacter } from '../../hooks/usePlayerCharacter';
import { useRealtimeWhispers } from '../../hooks/useRealtimeWhispers';
import { CampaignSelectorModal } from '../../components/common/CampaignSelectorModal';
import { blockWhisperUser, reportWhisper } from '../../api/whisperSafety';

const QUICK_PRESETS = [
  'Tiro furtivo',
  'Percezione passiva',
  'Azione segreta',
  'Uso componente misteriosa',
  'Esamino la stanza di nascosto',
  'Preparo un incantesimo verbale sottovoce',
];

export const PlayerWhisperScreen: React.FC = () => {
  const { user } = useAuth();
  const { activeCampaign, activeCampaignId } = useCampaign();
  const { activeCharacter } = usePlayerCharacter();
  const [inputText, setInputText] = useState('');
  const [campaignModalVisible, setCampaignModalVisible] = useState<boolean>(false);
  const scrollViewRef = useRef<any>(null);

  const effectiveGmId = activeCampaign?.gm_id || 'gm-demo-user';
  const effectiveCampaignTitle = activeCampaign?.name || 'Campagna Attiva';
  const effectiveCampaignId = activeCampaignId || 'demo-campaign-quest';

  // Realtime hook for whispers between Player and GM
  const {
    messages,
    sendWhisper,
    isSending,
    isLoading,
    refreshMessages,
  } = useRealtimeWhispers({
    campaignId: effectiveCampaignId,
    partnerId: effectiveGmId,
    autoMarkRead: true,
  });

  // Auto-scroll to latest message on messages update
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 120);
    return () => clearTimeout(timer);
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || isSending) return;
    const textToSend = inputText.trim();
    setInputText('');

    await sendWhisper(effectiveCampaignId, effectiveGmId, textToSend);

    // Scroll to bottom immediately
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [inputText, isSending, sendWhisper, effectiveCampaignId, effectiveGmId]);

  const handleApplyPreset = (preset: string) => {
    setInputText((prev) => (prev ? `${prev} - ${preset}` : preset));
  };

  const handleWhisperSafety = (whisperId: string, otherUserId: string) => {
    if (!user?.id || !whisperId || !otherUserId || otherUserId === user.id) return;
    Alert.alert('Sussurro', 'Come vuoi procedere?', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Segnala', onPress: () => {
        void reportWhisper({
          reporterId: user.id,
          reportedUserId: otherUserId,
          whisperId,
          campaignId: effectiveCampaignId,
        }).then(() => Alert.alert('Segnalazione inviata', 'Il team potrà esaminare il messaggio segnalato.'))
          .catch(() => Alert.alert('Invio non riuscito', 'Non siamo riusciti a inviare la segnalazione. Riprova.'));
      } },
      { text: 'Blocca', style: 'destructive', onPress: () => {
        Alert.alert('Bloccare questo account?', 'I nuovi sussurri tra voi verranno impediti.', [
          { text: 'Annulla', style: 'cancel' },
          { text: 'Blocca account', style: 'destructive', onPress: () => {
            void blockWhisperUser(user.id, otherUserId)
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        {/* Secrecy Warning Header with Campaign Switcher */}
        <View style={styles.securityBanner}>
          <View style={styles.securityIconBox}>
            <Lock size={13} color={colors.brassLight} />
          </View>
          <TouchableOpacity
            style={styles.securityTextContainer}
            onPress={() => setCampaignModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.securityBannerText}>
              CANALE CIFRATO CON IL MASTER • NESSUN ALTRO GIOCATORE PUÒ LEGGERE
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 }}>
              <Text style={styles.securitySubtext} numberOfLines={1}>
                {activeCharacter?.name || 'Avventuriero'} • {effectiveCampaignTitle}
              </Text>
              <ChevronDown size={11} color={colors.brassLight} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.refreshIconBtn}
            onPress={refreshMessages}
            activeOpacity={0.7}
          >
            <RefreshCw size={13} color={colors.parchmentMuted} />
          </TouchableOpacity>
        </View>

        {/* Messages Feed */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
        >
          {isLoading && messages.length === 0 ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="small" color={colors.brassBase} />
              <Text style={styles.loadingText}>Connessione al canale arcano...</Text>
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <EyeOff size={32} color={colors.stoneBorder} />
              <Text style={styles.emptyStateTitle}>Nessun sussurro ancora scambiato</Text>
              <Text style={styles.emptyStateDesc}>
                I sussurri sono comunicazioni private tra te e il Dungeon Master.
                Usali per tiri segreti, intenzioni celate o osservazioni riservate.
              </Text>
            </View>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === (user?.id || 'demo-player-1');
              const isOptimistic = msg.id.startsWith('optimistic-');

              return (
                <View
                  key={msg.id}
                  style={[
                    styles.messageRow,
                    isMe ? styles.messageRowMe : styles.messageRowGm,
                  ]}
                >
                  {!isMe && (
                    <View style={styles.gmAvatar}>
                      <Crown size={12} color={colors.brassLight} />
                    </View>
                  )}
                  <View
                    style={[
                      styles.messageBubble,
                      isMe ? styles.messageBubbleMe : styles.messageBubbleGm,
                    ]}
                  >
                    <View style={styles.bubbleHeader}>
                      <Text
                        style={[
                          styles.messageSender,
                          isMe ? styles.senderMe : styles.senderGm,
                        ]}
                      >
                        {isMe
                          ? `Tu (${activeCharacter?.name || 'Eroe'})`
                          : 'Game Master'}
                      </Text>
                      {isOptimistic && (
                        <Text style={styles.optimisticTag}>Invio...</Text>
                      )}
                    </View>
                    <Text style={styles.messageText}>{msg.message}</Text>
                    {!isMe && !isOptimistic ? (
                      <TouchableOpacity
                        style={styles.safetyAction}
                        onPress={() => handleWhisperSafety(msg.id, msg.sender_id)}
                        accessibilityRole="button"
                        accessibilityLabel="Segnala o blocca questo account"
                      >
                        <Flag size={12} color={colors.parchmentMuted} />
                        <Text style={styles.safetyActionText}>Segnala o blocca</Text>
                      </TouchableOpacity>
                    ) : null}
                    <View style={styles.bubbleFooter}>
                      <Text style={styles.messageTime}>
                        {formatMessageTime(msg.created_at)}
                      </Text>
                      {isMe && (
                        <ShieldCheck size={11} color={colors.brassDark} style={styles.checkIcon} />
                      )}
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Quick Presets / Chip rapidi di whispering */}
        <View style={styles.presetsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.presetsScroll}
          >
            {QUICK_PRESETS.map((preset, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.presetChip}
                onPress={() => handleApplyPreset(preset)}
                activeOpacity={0.75}
              >
                <Sparkles size={11} color={colors.brassLight} style={styles.presetSparkle} />
                <Text style={styles.presetText}>{preset}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.inputField}
            placeholder="Invia un sussurro segreto al GM..."
            placeholderTextColor={colors.parchmentMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={600}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isSending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isSending}
            activeOpacity={0.8}
          >
            {isSending ? (
              <ActivityIndicator size="small" color={colors.void} />
            ) : (
              <Send
                size={18}
                color={inputText.trim() ? colors.void : colors.stoneBorder}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Campaign Selector Modal */}
      <CampaignSelectorModal
        visible={campaignModalVisible}
        onClose={() => setCampaignModalVisible(false)}
      />
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
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.stoneSurface,
    borderBottomWidth: 1,
    borderBottomColor: colors.brassDark,
    paddingVertical: 9,
    paddingHorizontal: 12,
    gap: 8,
  },
  securityIconBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.brassDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityTextContainer: {
    flex: 1,
  },
  securityBannerText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: colors.brassLight,
    letterSpacing: 0.6,
  },
  securitySubtext: {
    fontSize: 10,
    color: colors.parchmentMuted,
    marginTop: 1,
  },
  refreshIconBtn: {
    padding: 6,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 24,
    gap: 12,
  },
  centerLoading: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    color: colors.parchmentMuted,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
    gap: 10,
  },
  emptyStateTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.parchmentLight,
    textAlign: 'center',
  },
  emptyStateDesc: {
    fontSize: 12,
    color: colors.parchmentMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageRowGm: {
    justifyContent: 'flex-start',
  },
  gmAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.brassBase,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  messageBubble: {
    maxWidth: '82%',
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  messageBubbleMe: {
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.brassDark,
    borderBottomRightRadius: 2,
  },
  messageBubbleGm: {
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    borderBottomLeftRadius: 2,
  },
  bubbleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  messageSender: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  senderMe: {
    color: colors.brassLight,
  },
  senderGm: {
    color: colors.brassLight,
  },
  optimisticTag: {
    fontSize: 9,
    color: colors.brassDark,
    fontStyle: 'italic',
  },
  messageText: {
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.parchmentLight,
  },
  safetyAction: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingTop: 8, alignSelf: 'flex-start' },
  safetyActionText: { color: colors.parchmentMuted, fontSize: 10, textDecorationLine: 'underline' },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 5,
  },
  messageTime: {
    fontSize: 9,
    color: colors.parchmentMuted,
  },
  checkIcon: {
    marginLeft: 2,
  },
  presetsContainer: {
    backgroundColor: colors.stone,
    borderTopWidth: 1,
    borderTopColor: colors.stoneBorder,
    paddingVertical: 8,
  },
  presetsScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.brassDark,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  presetSparkle: {
    marginRight: 4,
  },
  presetText: {
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
  inputField: {
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
  sendButton: {
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
  sendButtonDisabled: {
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    shadowOpacity: 0,
    elevation: 0,
  },
});

export default PlayerWhisperScreen;
