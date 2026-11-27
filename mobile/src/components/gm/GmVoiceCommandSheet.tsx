import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  AppState,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Check, Mic, Sparkles, X } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useGmLive, type GmLiveEntry, type GmLiveSnapshot } from '../../contexts/GmLiveContext';
import { usePushToTalk } from '../../hooks/usePushToTalk';

type MobileCommandOperation = NonNullable<
  NonNullable<GmLiveSnapshot['combatCommand']>['proposal']
>['operations'][number];

function formatCommandOperation(operation: MobileCommandOperation, entries: GmLiveEntry[]): string {
  const recipients = (operation.targetIds ?? [])
    .map((id) => entries.find((entry) => entry.id === id)?.name)
    .filter(Boolean)
    .join(', ');
  switch (operation.kind) {
    case 'damage':
      return `${operation.targetName} subisce ${operation.amount} danni${operation.sourceLabel ? ` · fonte: ${operation.sourceLabel}` : ''}`;
    case 'heal':
      return `${operation.targetName} recupera ${operation.amount} PF`;
    case 'set_exact_hp':
      return `${operation.targetName} passa a ${operation.exactHp} PF`;
    case 'add_effect':
      return `${operation.label} → ${operation.targetName}${operation.spellName ? ` · incantesimo: ${operation.spellName}` : ''}${operation.sourceName ? ` · fonte: ${operation.sourceName}` : ''}`;
    case 'remove_effect':
      return `Rimuovi effetto da ${operation.targetName}`;
    case 'start_concentration':
      return `${operation.casterName} inizia concentrazione${operation.spellName ? ` su ${operation.spellName}` : ''}${recipients ? ` · bersagli: ${recipients}` : ''}`;
    case 'break_concentration':
      return `${operation.casterName} interrompe la concentrazione`;
    default:
      return `Dettaglio operazione non disponibile: ${operation.kind}`;
  }
}

function createRequestId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const ListeningIndicator: React.FC = () => {
  const pulse = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState(true);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      pulse.setValue(1);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.35, duration: 650, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => {
      animation.stop();
      pulse.setValue(1);
    };
  }, [pulse, reduceMotion]);

  return (
    <View accessibilityLiveRegion="polite" style={styles.listeningRow}>
      <Animated.View
        importantForAccessibility="no"
        style={[
          styles.listeningDot,
          {
            opacity: pulse,
            transform: [
              {
                scale: pulse.interpolate({
                  inputRange: [0.35, 1],
                  outputRange: [0.8, 1.2],
                }),
              },
            ],
          },
        ]}
      />
      <Text style={styles.listeningText}>Microfono attivo · In ascolto</Text>
    </View>
  );
};

export interface GmVoiceCommandSheetProps {
  visible: boolean;
  blocked: boolean;
  onClose: () => void;
  onNotice?: (text: string) => void;
}

export const GmVoiceCommandSheet: React.FC<GmVoiceCommandSheetProps> = ({
  visible,
  blocked,
  onClose,
  onNotice,
}) => {
  const live = useGmLive();
  const {
    state: voiceState,
    transcript: voiceTranscript,
    message: voiceMessage,
    begin: beginVoice,
    release: releaseVoice,
    cancel: cancelVoice,
    handleAppStateChange: handleVoiceAppState,
  } = usePushToTalk();

  const [commandText, setCommandText] = useState('');
  const [commandMode, setCommandMode] = useState<'local' | 'ai'>('local');
  const [commandPending, setCommandPending] = useState(false);
  const [localNotice, setLocalNotice] = useState('');
  const requestIdRef = useRef<string | null>(null);
  const requestFingerprintRef = useRef('');
  const confirmCommandIdRef = useRef<string | null>(null);
  const [selectedOperationIds, setSelectedOperationIds] = useState<string[]>([]);
  const lastTranscriptRef = useRef('');

  const publishNotice = (msg: string) => {
    setLocalNotice(msg);
    onNotice?.(msg);
  };

  useEffect(() => {
    if (!visible) {
      cancelVoice('Dettatura chiusa.');
    }
  }, [visible, cancelVoice]);

  useEffect(() => {
    if (voiceState === 'requesting') lastTranscriptRef.current = '';
  }, [voiceState]);

  useEffect(() => {
    handleVoiceAppState(AppState.currentState);
    const subscription = AppState.addEventListener('change', handleVoiceAppState);
    return () => subscription.remove();
  }, [handleVoiceAppState]);

  useEffect(() => {
    if (voiceTranscript && voiceTranscript !== lastTranscriptRef.current) {
      lastTranscriptRef.current = voiceTranscript;
      setCommandText((current) =>
        current.trim() ? `${current.trim()} ${voiceTranscript}` : voiceTranscript,
      );
      requestIdRef.current = null;
    }
  }, [voiceTranscript]);

  const snapshot = live.snapshot;
  const entries = snapshot?.entries ?? [];
  const command = snapshot?.combatCommand;
  const commandProposalRef = useRef(command?.proposal);
  commandProposalRef.current = command?.proposal;

  const commandContextMatches =
    command?.campaignId === live.campaignId &&
    command?.remoteSessionPublicId === live.pairing?.publicId &&
    command?.sessionId === snapshot?.sessionId &&
    command?.matchId === (snapshot?.matchId ?? null) &&
    (command?.status !== 'proposal' || command?.stateSignature === snapshot?.stateSignature);

  useEffect(() => {
    const proposal = commandProposalRef.current;
    if (proposal) {
      setSelectedOperationIds(proposal.operations.map((op) => op.id));
      confirmCommandIdRef.current = null;
    }
  }, [command?.proposalId]);

  const sendCombatCommand = async () => {
    const text = commandText.trim();
    if (!text || blocked || commandPending) return;
    if (snapshot?.matchId) {
      publishNotice('La proposta vocale è disponibile per il combattimento della sessione, non per il focus torneo.');
      return;
    }
    if (!snapshot?.stateSignature || !snapshot.sessionId) {
      publishNotice('Il PC non ha pubblicato il contesto della sessione. Aggiorna il GM Screen.');
      return;
    }
    if (Date.now() - Date.parse(snapshot.updatedAt) > 20_000) {
      publishNotice('Snapshot del PC scaduto. Attendi una nuova sincronizzazione prima di inviare.');
      return;
    }
    const fingerprint = JSON.stringify([
      text,
      commandMode,
      live.campaignId,
      snapshot.sessionId,
      snapshot.matchId ?? null,
      snapshot.stateSignature,
    ]);
    const requestId =
      requestIdRef.current &&
      requestFingerprintRef.current === fingerprint &&
      (!command || command.status === 'awaiting')
        ? requestIdRef.current
        : createRequestId();
    requestFingerprintRef.current = fingerprint;
    requestIdRef.current = requestId;
    setCommandPending(true);
    publishNotice('Invio richiesta al PC…');
    const result = await live.sendCommand(
      'combat.command_request',
      {
        request_id: requestId,
        text,
        mode: commandMode,
        campaign_id: live.campaignId,
        session_id: snapshot.sessionId,
        match_id: snapshot.matchId ?? null,
        state_signature: snapshot.stateSignature,
      },
      requestId,
    );
    setCommandPending(false);
    publishNotice(
      result.ok
        ? 'Richiesta accodata · in attesa dell’analisi sul PC'
        : `Richiesta non inviata: ${result.error || 'errore'}`,
    );
    if (result.ok) void live.refresh();
  };

  const confirmCombatCommand = async () => {
    if (!command?.proposalId || !command.proposal || commandPending || blocked || !commandContextMatches) return;
    if (command.proposal.unresolvedTargets.length || command.proposal.missingData.length) {
      publishNotice('Completa bersagli e dati mancanti correggendo il comando e chiedendo una nuova analisi.');
      return;
    }
    const commandId = confirmCommandIdRef.current ?? createRequestId();
    confirmCommandIdRef.current = commandId;
    setCommandPending(true);
    publishNotice('Conferma inviata · in attesa dell’applicazione sul PC');
    const result = await live.sendCommand(
      'combat.command_confirm',
      {
        request_id: command.requestId,
        proposal_id: command.proposalId,
        operation_ids: selectedOperationIds,
        campaign_id: live.campaignId,
        state_signature: snapshot?.stateSignature,
        session_id: snapshot?.sessionId,
        match_id: snapshot?.matchId ?? null,
      },
      commandId,
    );
    setCommandPending(false);
    publishNotice(
      result.ok
        ? 'Conferma accodata · attendo la ricevuta del PC'
        : `Conferma non inviata: ${result.error || 'errore'}`,
    );
    if (result.ok) void live.refresh();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>ASSISTENTE COMBATTIMENTO</Text>
              <Text style={styles.title}>Comando Vocale & IA al GM Screen</Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Chiudi pannello comando vocale"
            >
              <X size={20} color={colors.parchmentLight} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <Text style={styles.hint}>
              Tieni premuto per dettare. La trascrizione resta sul telefono e puoi correggerla prima dell’invio.
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tieni premuto per parlare al GM Screen"
              accessibilityHint="Rilascia per fermare la dettatura e rivedere il testo"
              disabled={blocked || voiceState === 'stopping'}
              onPressIn={() => void beginVoice()}
              onPressOut={releaseVoice}
              onLongPress={() => undefined}
              style={({ pressed }) => [
                styles.voiceButton,
                (pressed || voiceState === 'listening') && styles.voiceButtonPressed,
                blocked && styles.disabled,
              ]}
            >
              {voiceState === 'requesting' || voiceState === 'starting' || voiceState === 'stopping' ? (
                <ActivityIndicator color={colors.void} />
              ) : (
                <Mic size={20} color={colors.void} />
              )}
              <Text style={styles.voiceButtonText}>
                {voiceState === 'listening'
                  ? 'In ascolto · rilascia per fermare'
                  : voiceState === 'starting'
                    ? 'Avvio del microfono…'
                    : voiceState === 'requesting'
                      ? 'Richiesta permesso…'
                      : voiceState === 'stopping'
                        ? 'Trascrizione in corso…'
                        : 'Tieni premuto per parlare'}
              </Text>
            </Pressable>

            {voiceState === 'listening' && <ListeningIndicator />}
            {!!voiceMessage && <Text style={styles.errorMsg}>{voiceMessage}</Text>}

            <Text style={styles.label}>Testo del comando</Text>
            <TextInput
              accessibilityLabel="Testo del comando per il GM Screen"
              multiline
              value={commandText}
              onChangeText={(val) => {
                setCommandText(val);
                requestIdRef.current = null;
              }}
              placeholder="Es. Goblin 1 subisce 8 danni taglienti"
              placeholderTextColor={colors.parchmentMuted}
              style={styles.input}
              editable={!commandPending}
            />

            <View style={styles.modeRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: commandMode === 'local' }}
                onPress={() => {
                  setCommandMode('local');
                  requestIdRef.current = null;
                }}
                style={[styles.modeBtn, commandMode === 'local' && styles.modeBtnSelected]}
              >
                <Text style={[styles.modeText, commandMode === 'local' && styles.modeTextSelected]}>
                  Analisi locale
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: commandMode === 'ai' }}
                onPress={() => {
                  setCommandMode('ai');
                  requestIdRef.current = null;
                }}
                style={[styles.modeBtn, commandMode === 'ai' && styles.modeBtnSelected]}
              >
                <Sparkles size={14} color={commandMode === 'ai' ? colors.void : colors.brassLight} />
                <Text style={[styles.modeText, commandMode === 'ai' && styles.modeTextSelected]}>
                  Chiedi IA
                </Text>
              </Pressable>
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={blocked || commandPending || !commandText.trim()}
              onPress={() => void sendCombatCommand()}
              style={[
                styles.sendButton,
                (blocked || commandPending || !commandText.trim()) && styles.disabled,
              ]}
            >
              {commandPending ? (
                <ActivityIndicator color={colors.void} />
              ) : (
                <Text style={styles.sendText}>Invia al PC per revisione</Text>
              )}
            </Pressable>

            {!!localNotice && <Text style={styles.noticeText}>{localNotice}</Text>}

            {!!command && commandContextMatches && (
              <View style={styles.reviewBox}>
                <Text style={styles.reviewStatus}>
                  {command.status === 'awaiting'
                    ? 'In attesa del PC'
                    : command.status === 'proposal'
                      ? 'Proposta da rivedere'
                      : command.status === 'applied'
                        ? 'Applicato dal PC'
                        : 'Richiesta rifiutata'}
                </Text>
                {!!command.message && <Text style={styles.hint}>{command.message}</Text>}

                {command.proposal?.operations.map((operation) => {
                  const selected = selectedOperationIds.includes(operation.id);
                  return (
                    <Pressable
                      key={operation.id}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      onPress={() =>
                        setSelectedOperationIds((curr) =>
                          selected ? curr.filter((id) => id !== operation.id) : [...curr, operation.id],
                        )
                      }
                      style={styles.opRow}
                    >
                      <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                        {selected ? <Check size={13} color={colors.void} /> : null}
                      </View>
                      <Text style={styles.opText}>{formatCommandOperation(operation, entries)}</Text>
                    </Pressable>
                  );
                })}

                {!!command.proposal?.unresolvedTargets.length && (
                  <Text style={styles.errorMsg}>
                    Bersagli da precisare:{' '}
                    {command.proposal.unresolvedTargets
                      .map(
                        (t) =>
                          `${t.query}${t.candidates?.length ? ` (${t.candidates.map((c) => c.name).join(', ')})` : ''}`,
                      )
                      .join('; ')}
                    . Correggi il testo sopra e richiedi una nuova analisi.
                  </Text>
                )}

                {!!command.proposal?.missingData.length && (
                  <Text style={styles.errorMsg}>
                    Dati mancanti: {command.proposal.missingData.map((m) => m.message).join(' ')}
                  </Text>
                )}

                {command.status === 'proposal' && (
                  <Pressable
                    accessibilityRole="button"
                    disabled={
                      blocked ||
                      commandPending ||
                      !selectedOperationIds.length ||
                      !command.proposal ||
                      !!command.proposal.unresolvedTargets.length ||
                      !!command.proposal.missingData.length
                    }
                    onPress={() => void confirmCombatCommand()}
                    style={[
                      styles.sendButton,
                      (blocked ||
                        commandPending ||
                        !selectedOperationIds.length ||
                        !!command.proposal?.unresolvedTargets.length ||
                        !!command.proposal?.missingData.length) &&
                        styles.disabled,
                    ]}
                  >
                    <Check size={17} color={colors.void} />
                    <Text style={styles.sendText}>Conferma proposta</Text>
                  </Pressable>
                )}

                {command.status === 'applied' && (
                  <Text style={styles.receiptText}>
                    Ricevuta PC ·{' '}
                    {command.receipt?.appliedAt
                      ? new Date(command.receipt.appliedAt).toLocaleTimeString()
                      : 'applicazione verificata'}
                  </Text>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  sheet: {
    maxHeight: '88%',
    backgroundColor: colors.stoneSurface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1.5,
    borderColor: colors.brassDark,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.stoneBorder,
    backgroundColor: colors.stone,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  eyebrow: {
    color: colors.brassLight,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: {
    color: colors.parchmentLight,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  closeBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: 16,
    paddingBottom: 32,
    gap: 10,
  },
  hint: {
    color: colors.parchmentMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  listeningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  listeningDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.emerald,
  },
  listeningText: {
    color: colors.emerald,
    fontWeight: '700',
    fontSize: 13,
  },
  voiceButton: {
    minHeight: 54,
    borderRadius: 10,
    backgroundColor: colors.brassBase,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  voiceButtonPressed: {
    backgroundColor: colors.brassLight,
    opacity: 0.92,
  },
  voiceButtonText: {
    color: colors.void,
    fontSize: 14,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.45,
  },
  errorMsg: {
    color: colors.crimsonLight,
    fontSize: 12,
    lineHeight: 17,
  },
  label: {
    color: colors.parchmentLight,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  input: {
    minHeight: 76,
    textAlignVertical: 'top',
    color: colors.parchmentLight,
    backgroundColor: colors.void,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    lineHeight: 21,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeBtn: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  modeBtnSelected: {
    backgroundColor: colors.brassBase,
    borderColor: colors.brassBase,
  },
  modeText: {
    color: colors.parchmentMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  modeTextSelected: {
    color: colors.void,
    fontWeight: '800',
  },
  sendButton: {
    minHeight: 50,
    borderRadius: 8,
    backgroundColor: colors.brassBase,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sendText: {
    color: colors.void,
    fontSize: 14,
    fontWeight: '900',
  },
  noticeText: {
    color: colors.brassLight,
    fontSize: 12,
    textAlign: 'center',
  },
  reviewBox: {
    backgroundColor: colors.void,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 12,
    gap: 8,
  },
  reviewStatus: {
    color: colors.brassLight,
    fontSize: 13,
    fontWeight: '900',
  },
  opRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: colors.brassBase,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.brassBase,
  },
  opText: {
    flex: 1,
    color: colors.parchmentLight,
    fontSize: 13,
    lineHeight: 18,
  },
  receiptText: {
    color: colors.emerald,
    fontSize: 12,
    fontWeight: '800',
  },
});
