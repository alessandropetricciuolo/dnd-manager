import React, { useEffect, useRef, useState } from 'react';
import { Alert, ActivityIndicator, AppState, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Check, Mic, Plus, RotateCcw, Sparkles, Swords, Trash2, Wifi, WifiOff } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useGmLive, type GmLiveEntry, type GmLiveSnapshot } from '../../contexts/GmLiveContext';
import { useGmCampaigns } from '../../hooks/useGmCampaigns';
import { useIsFocused } from '@react-navigation/native';
import { usePushToTalk } from '../../hooks/usePushToTalk';

const LIVE_CONDITIONS = [
  ['accecato', 'Accecato'], ['affascinato', 'Affascinato'], ['assordato', 'Assordato'],
  ['avvelenato', 'Avvelenato'], ['afferrato', 'Afferrato'], ['incapacitato', 'Incapacitato'],
  ['invisibile', 'Invisibile'], ['paralizzato', 'Paralizzato'], ['pietrificato', 'Pietrificato'],
  ['prono', 'Prono'], ['spaventato', 'Spaventato'], ['stordito', 'Stordito'],
  ['trattenuto', 'Trattenuto'], ['esausto', 'Esausto'], ['sotto_tiro', 'Sotto tiro'],
  ['concentrato', 'Concentrato'],
] as const;

type MobileCommandOperation = NonNullable<NonNullable<GmLiveSnapshot['combatCommand']>['proposal']>['operations'][number];

function formatCommandOperation(operation: MobileCommandOperation, entries: GmLiveEntry[]): string {
  const recipients = (operation.targetIds ?? []).map((id) => entries.find((entry) => entry.id === id)?.name).filter(Boolean).join(', ');
  switch (operation.kind) {
    case 'damage': return `${operation.targetName} subisce ${operation.amount} danni${operation.sourceLabel ? ` · fonte: ${operation.sourceLabel}` : ''}`;
    case 'heal': return `${operation.targetName} recupera ${operation.amount} PF`;
    case 'set_exact_hp': return `${operation.targetName} passa a ${operation.exactHp} PF`;
    case 'add_effect': return `${operation.label} → ${operation.targetName}${operation.spellName ? ` · incantesimo: ${operation.spellName}` : ''}${operation.sourceName ? ` · fonte: ${operation.sourceName}` : ''}`;
    case 'remove_effect': return `Rimuovi effetto da ${operation.targetName}`;
    case 'start_concentration': return `${operation.casterName} inizia concentrazione${operation.spellName ? ` su ${operation.spellName}` : ''}${recipients ? ` · bersagli: ${recipients}` : ''}`;
    case 'break_concentration': return `${operation.casterName} interrompe la concentrazione`;
    default: return `Dettaglio operazione non disponibile: ${operation.kind}`;
  }
}

const GmLiveCombatTrackerScreen: React.FC = () => {
  const live = useGmLive();
  const setSnapshotConsumer = live.setSnapshotConsumer;
  const { activeCampaign } = useGmCampaigns();
  const isFocused = useIsFocused();
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState('');
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newHp, setNewHp] = useState('');
  const [newAc, setNewAc] = useState('');
  const [newInitiative, setNewInitiative] = useState('');
  const { state: voiceState, transcript: voiceTranscript, message: voiceMessage, begin: beginVoice, release: releaseVoice, cancel: cancelVoice } = usePushToTalk();
  const [commandText, setCommandText] = useState('');
  const [commandMode, setCommandMode] = useState<'local' | 'ai'>('local');
  const [commandPending, setCommandPending] = useState(false);
  const requestIdRef = useRef<string | null>(null);
  const requestFingerprintRef = useRef('');
  const confirmCommandIdRef = useRef<string | null>(null);
  const [selectedOperationIds, setSelectedOperationIds] = useState<string[]>([]);
  const lastTranscriptRef = useRef('');

  useEffect(() => {
    setSnapshotConsumer('initiative', isFocused);
    return () => setSnapshotConsumer('initiative', false);
  }, [isFocused, setSnapshotConsumer]);

  useEffect(() => {
    if (!isFocused) cancelVoice();
  }, [isFocused, cancelVoice]);
  useEffect(() => {
    if (voiceState === 'requesting') lastTranscriptRef.current = '';
  }, [voiceState]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active') cancelVoice();
    });
    return () => subscription.remove();
  }, [cancelVoice]);
  useEffect(() => {
    if (voiceTranscript && voiceTranscript !== lastTranscriptRef.current) {
      lastTranscriptRef.current = voiceTranscript;
      setCommandText((current) => current.trim() ? `${current.trim()} ${voiceTranscript}` : voiceTranscript);
      requestIdRef.current = null;
    }
  }, [voiceTranscript]);

  const snapshot = live.snapshot;
  const entries = snapshot?.entries ?? [];
  const current = entries.length ? entries[((snapshot?.currentTurnIndex ?? 0) % entries.length + entries.length) % entries.length] : null;

  const send = async (type: string, payload: Record<string, unknown> = {}) => {
    setPending(true);
    setNotice('Invio al PC…');
    const scopedPayload = snapshot?.matchId ? { ...payload, match_id: snapshot.matchId } : payload;
    const result = await live.sendCommand(type, scopedPayload);
    setPending(false);
    if (result.ok) {
      setNotice('Comando accodato · in attesa dello snapshot del PC');
      void live.refresh();
    } else {
      setNotice(`Comando non inviato: ${result.error || 'errore'}`);
    }
  };

  const adjustHp = (entry: GmLiveEntry, delta: number | 'ko') => {
    if (delta === 'ko') {
      void send('initiative.set_hp', { entry_id: entry.id, hp: 0 });
      return;
    }
    void send('initiative.adjust_hp', { entry_id: entry.id, delta });
  };

  const toggleCondition = (entry: GmLiveEntry, conditionId: string) => {
    void send('initiative.toggle_condition', { entry_id: entry.id, condition: conditionId });
  };

  const removeEntry = (entry: GmLiveEntry) => {
    Alert.alert('Rimuovi combattente', `Rimuovere ${entry.name} dalla live?`, [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Rimuovi', style: 'destructive', onPress: () => void send('initiative.remove_combatant', { entry_id: entry.id }) },
    ]);
  };

  const addEntry = () => {
    const name = newName.trim();
    const hp = Number.parseInt(newHp, 10);
    const ac = Number.parseInt(newAc, 10);
    const initiative = Number.parseInt(newInitiative, 10);
    if (!name || !Number.isFinite(hp) || hp < 1 || !Number.isFinite(ac) || !Number.isFinite(initiative)) {
      Alert.alert('Dati incompleti', 'Inserisci nome, PF, CA e iniziativa manuale.');
      return;
    }
    const id = `mobile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    void send('initiative.add_combatant', {
      combatant: { id, name, type: 'monster', hp, maxHp: hp, initiative, ac, conditions: [] },
    });
    setAddModalVisible(false);
    setNewName('');
    setNewHp('');
    setNewAc('');
    setNewInitiative('');
  };

  const pcOnline = live.status === 'online' && live.campaignId === activeCampaign?.id;
  const blocked = live.status !== 'online' || live.controlsReady === false || snapshot?.controlsReady === false || !snapshot;
  const command = snapshot?.combatCommand;
  const commandProposalRef = useRef(command?.proposal);
  commandProposalRef.current = command?.proposal;
  const commandContextMatches = command?.campaignId === live.campaignId && command?.remoteSessionPublicId === live.pairing?.publicId && command?.sessionId === snapshot?.sessionId && command?.matchId === (snapshot?.matchId ?? null) && (command?.status !== 'proposal' || command?.stateSignature === snapshot?.stateSignature);

  useEffect(() => {
    const proposal = commandProposalRef.current;
    if (proposal) {
      setSelectedOperationIds(proposal.operations.map((operation) => operation.id));
      confirmCommandIdRef.current = null;
    }
  }, [command?.proposalId]);

  const createRequestId = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

  const sendCombatCommand = async () => {
    const text = commandText.trim();
    if (!text || blocked || commandPending) return;
    if (snapshot?.matchId) {
      setNotice('La proposta vocale è disponibile per il combattimento della sessione, non per il focus torneo.');
      return;
    }
    if (!snapshot?.stateSignature || !snapshot.sessionId) {
      setNotice('Il PC non ha pubblicato il contesto della sessione. Aggiorna il GM Screen.');
      return;
    }
    if (Date.now() - Date.parse(snapshot.updatedAt) > 20_000) {
      setNotice('Snapshot del PC scaduto. Attendi una nuova sincronizzazione prima di inviare.');
      return;
    }
    const fingerprint = JSON.stringify([text, commandMode, live.campaignId, snapshot.sessionId, snapshot.matchId ?? null, snapshot.stateSignature]);
    const requestId = requestIdRef.current && requestFingerprintRef.current === fingerprint && (!command || command.status === 'awaiting')
      ? requestIdRef.current
      : createRequestId();
    requestFingerprintRef.current = fingerprint;
    requestIdRef.current = requestId;
    setCommandPending(true);
    setNotice('Invio richiesta al PC…');
    const result = await live.sendCommand('combat.command_request', {
      request_id: requestId,
      text,
      mode: commandMode,
      campaign_id: live.campaignId,
      session_id: snapshot.sessionId,
      match_id: snapshot.matchId ?? null,
      state_signature: snapshot.stateSignature,
    }, requestId);
    setCommandPending(false);
    setNotice(result.ok ? 'Richiesta accodata · in attesa dell’analisi sul PC' : `Richiesta non inviata: ${result.error || 'errore'}`);
    if (result.ok) void live.refresh();
  };

  const confirmCombatCommand = async () => {
    if (!command?.proposalId || !command.proposal || commandPending || blocked || !commandContextMatches) return;
    if (command.proposal.unresolvedTargets.length || command.proposal.missingData.length) {
      setNotice('Completa bersagli e dati mancanti correggendo il comando e chiedendo una nuova analisi.');
      return;
    }
    const commandId = confirmCommandIdRef.current ?? createRequestId();
    confirmCommandIdRef.current = commandId;
    setCommandPending(true);
    setNotice('Conferma inviata · in attesa dell’applicazione sul PC');
    const result = await live.sendCommand('combat.command_confirm', {
      request_id: command.requestId,
      proposal_id: command.proposalId,
      operation_ids: selectedOperationIds,
      campaign_id: live.campaignId,
      state_signature: snapshot?.stateSignature,
      session_id: snapshot?.sessionId,
      match_id: snapshot?.matchId ?? null,
    }, commandId);
    setCommandPending(false);
    setNotice(result.ok ? 'Conferma accodata · attendo la ricevuta del PC' : `Conferma non inviata: ${result.error || 'errore'}`);
    if (result.ok) void live.refresh();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.liveHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.liveHeaderEyebrow}>INIZIATIVA CONDIVISA</Text>
            <Text style={styles.liveHeaderTitle}>
              {live.status === 'unpaired' ? 'Collega prima il GM Screen dalla Regia' : live.status === 'mismatch' ? 'Campagna non corrispondente' : live.status === 'expired' ? 'Sessione scaduta' : live.status === 'online' ? 'PC online' : live.status === 'checking' ? 'Verifica sessione…' : 'PC offline'}
            </Text>
            <Text style={styles.liveHeaderSub}>{live.campaignId === activeCampaign?.id ? activeCampaign?.name : 'Campagna non verificata'}{live.expiresAt ? ` · scade ${new Date(live.expiresAt).toLocaleTimeString()}` : ''}</Text>
          </View>
          {live.status === 'checking' ? <ActivityIndicator color={colors.brassLight} /> : pcOnline ? <Wifi size={19} color={colors.emerald} /> : <WifiOff size={19} color={colors.crimsonLight} />}
        </View>

        {live.status === 'mismatch' && <Text style={styles.liveError}>{live.error || 'La live appartiene a un’altra campagna. I comandi sono bloccati.'}</Text>}
        {live.status === 'offline' && <Text style={styles.liveWarning}>Sessione valida, PC momentaneamente non presente. I comandi sono sospesi e lo snapshot visibile può essere superato.</Text>}
        {live.status === 'online' && (live.controlsReady === false || snapshot?.controlsReady === false) && <Text style={styles.liveWarning}>GM Screen online, ma il pannello iniziativa non è pronto sul PC. Il combattimento è in sola lettura.</Text>}

        <View style={styles.voiceCard}>
          <Text style={styles.voiceTitle}>Comando al GM Screen</Text>
          <Text style={styles.voiceHint}>Tieni premuto per dettare. La trascrizione resta sul telefono e puoi correggerla prima dell’invio.</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tieni premuto per parlare al GM Screen"
            accessibilityHint="Rilascia per fermare la dettatura e rivedere il testo"
            disabled={blocked || voiceState === 'stopping' || voiceState === 'unavailable'}
            onPressIn={() => void beginVoice()}
            onPressOut={releaseVoice}
            onLongPress={() => undefined}
            style={({ pressed }) => [styles.voiceButton, pressed && styles.voiceButtonPressed, (blocked || voiceState === 'unavailable') && styles.voiceDisabled]}
          >
            {voiceState === 'requesting' || voiceState === 'stopping'
              ? <ActivityIndicator color={colors.void} />
              : <Mic size={20} color={colors.void} />}
            <Text style={styles.voiceButtonText}>{voiceState === 'listening' ? 'In ascolto · rilascia per fermare' : voiceState === 'requesting' ? 'Richiesta permesso…' : 'Tieni premuto per parlare'}</Text>
          </Pressable>
          {!!voiceMessage && <Text style={styles.voiceMessage}>{voiceMessage}</Text>}
          <Text style={styles.voiceLabel}>Testo del comando</Text>
          <TextInput
            accessibilityLabel="Testo del comando per il GM Screen"
            multiline
            value={commandText}
            onChangeText={(value) => { setCommandText(value); requestIdRef.current = null; }}
            placeholder="Es. Goblin 1 subisce 8 danni"
            placeholderTextColor={colors.parchmentMuted}
            style={styles.voiceInput}
            editable={!commandPending}
          />
          <View style={styles.voiceModeRow}>
            <Pressable accessibilityRole="button" accessibilityState={{ selected: commandMode === 'local' }} onPress={() => { setCommandMode('local'); requestIdRef.current = null; }} style={[styles.voiceModeButton, commandMode === 'local' && styles.voiceModeSelected]}>
              <Text style={[styles.voiceModeText, commandMode === 'local' && styles.voiceModeTextSelected]}>Analisi locale</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityState={{ selected: commandMode === 'ai' }} onPress={() => { setCommandMode('ai'); requestIdRef.current = null; }} style={[styles.voiceModeButton, commandMode === 'ai' && styles.voiceModeSelected]}>
              <Sparkles size={14} color={commandMode === 'ai' ? colors.void : colors.brassLight} />
              <Text style={[styles.voiceModeText, commandMode === 'ai' && styles.voiceModeTextSelected]}>Chiedi IA</Text>
            </Pressable>
          </View>
          <Pressable accessibilityRole="button" disabled={blocked || commandPending || !commandText.trim()} onPress={() => void sendCombatCommand()} style={[styles.voiceSendButton, (blocked || commandPending || !commandText.trim()) && styles.voiceDisabled]}>
            {commandPending ? <ActivityIndicator color={colors.void} /> : <Text style={styles.voiceSendText}>Invia al PC per revisione</Text>}
          </Pressable>
          {!!command && commandContextMatches && <View style={styles.commandReview}>
            <Text style={styles.commandStatus}>{command.status === 'awaiting' ? 'In attesa del PC' : command.status === 'proposal' ? 'Proposta da rivedere' : command.status === 'applied' ? 'Applicato dal PC' : 'Richiesta rifiutata'}</Text>
            {!!command.message && <Text style={styles.voiceHint}>{command.message}</Text>}
            {command.proposal?.operations.map((operation) => {
              const selected = selectedOperationIds.includes(operation.id);
              return <Pressable key={operation.id} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={() => setSelectedOperationIds((current) => selected ? current.filter((id) => id !== operation.id) : [...current, operation.id])} style={styles.commandOperationRow}>
                <View style={[styles.commandCheckbox, selected && styles.commandCheckboxSelected]}>{selected ? <Check size={13} color={colors.void} /> : null}</View>
                <Text style={styles.commandOperation}>{formatCommandOperation(operation, entries)}</Text>
              </Pressable>;
            })}
            {!!command.proposal?.unresolvedTargets.length && <Text style={styles.voiceMessage}>Bersagli da precisare: {command.proposal.unresolvedTargets.map((target) => `${target.query}${target.candidates?.length ? ` (${target.candidates.map((candidate) => candidate.name).join(', ')})` : ''}`).join('; ')}. Correggi il testo sopra e richiedi una nuova analisi.</Text>}
            {!!command.proposal?.missingData.length && <Text style={styles.voiceMessage}>Dati mancanti: {command.proposal.missingData.map((missing) => missing.message).join(' ')}</Text>}
            {command.status === 'proposal' && <Pressable accessibilityRole="button" disabled={blocked || commandPending || !selectedOperationIds.length || !command.proposal || !!command.proposal.unresolvedTargets.length || !!command.proposal.missingData.length} onPress={() => void confirmCombatCommand()} style={[styles.voiceConfirmButton, (blocked || commandPending || !selectedOperationIds.length || !!command.proposal?.unresolvedTargets.length || !!command.proposal?.missingData.length) && styles.voiceDisabled]}>
              <Check size={17} color={colors.void} /><Text style={styles.voiceSendText}>Conferma proposta</Text>
            </Pressable>}
            {command.status === 'applied' && <Text style={styles.commandReceipt}>Ricevuta PC · {command.receipt?.appliedAt ? new Date(command.receipt.appliedAt).toLocaleTimeString() : 'applicazione verificata'}</Text>}
          </View>}
        </View>

        <View style={styles.liveRoundCard}>
          <View>
            <Text style={styles.liveRoundLabel}>ROUND</Text>
            <Text style={styles.liveRoundNumber}>{snapshot?.roundNumber ?? '—'}</Text>
          </View>
          <TouchableOpacity disabled={pending || blocked || !snapshot} style={styles.liveTurnButton} onPress={() => void send('initiative.prev_turn')}>
            <Text style={styles.liveTurnButtonText}>◀ Prec</Text>
          </TouchableOpacity>
          <TouchableOpacity disabled={pending || blocked || !snapshot} style={[styles.liveTurnButton, styles.liveTurnPrimary]} onPress={() => void send('initiative.next_turn')}>
            <Text style={[styles.liveTurnButtonText, styles.liveTurnPrimaryText]}>Prossimo ▶</Text>
          </TouchableOpacity>
          <TouchableOpacity disabled={pending || blocked || !snapshot} style={styles.liveIconButton} onPress={() => Alert.alert('Azzera round', 'Riportare il combattimento al round 1?', [
            { text: 'Annulla', style: 'cancel' }, { text: 'Azzera', style: 'destructive', onPress: () => void send('initiative.reset_round') },
          ])}>
            <RotateCcw size={15} color={colors.parchmentMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.liveTimerRow}>
          <Text style={styles.liveTimerText}>{snapshot?.isTurnTimerRunning ? 'Timer turno attivo' : 'Timer turno fermo'} · {snapshot?.turnElapsedSeconds ?? 0}s</Text>
          <TouchableOpacity disabled={pending || blocked || !snapshot} onPress={() => void send('initiative.toggle_timer')}>
            <Text style={styles.liveTimerAction}>{snapshot?.isTurnTimerRunning ? 'Ferma timer' : 'Avvia timer'}</Text>
          </TouchableOpacity>
          <TouchableOpacity disabled={pending || blocked || !snapshot} onPress={() => void send('initiative.reset_turn_timer')}>
            <Text style={styles.liveTimerAction}>Azzera</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.liveActionBar}>
          <Text style={styles.liveCount}>{entries.length} combattenti</Text>
          <TouchableOpacity disabled={blocked} style={styles.liveAddButton} onPress={() => setAddModalVisible(true)}>
            <Plus size={14} color={colors.void} /><Text style={styles.liveAddText}>Aggiungi mostro</Text>
          </TouchableOpacity>
        </View>

        {current && <View style={styles.liveSpotlight}>
          <Text style={styles.liveSpotlightLabel}>È IL TURNO DI</Text>
          <Text style={styles.liveSpotlightName}>{current.name}</Text>
          <Text style={styles.liveSpotlightInfo}>Iniziativa {current.initiative} · CA {current.ac ?? '—'} · {current.hp}/{current.maxHp} PF</Text>
        </View>}

        {entries.length === 0 ? (
          <View style={styles.emptyCard}>
            {live.status === 'checking' ? <ActivityIndicator color={colors.brassLight} /> : <Swords size={30} color={colors.parchmentMuted} />}
            <Text style={styles.emptyTitle}>{live.status === 'unpaired' ? 'Nessuna live collegata' : blocked ? 'Controllo live bloccato' : !snapshot ? 'In attesa dello snapshot del PC' : 'Nessun combattente nella live'}</Text>
            <Text style={styles.emptySubtitle}>{live.error || 'Lo stato arriva dal GM Screen collegato.'}</Text>
          </View>
        ) : entries.map((entry, index) => (
          <View key={entry.id} style={[styles.liveEntryCard, index === snapshot?.currentTurnIndex && styles.liveEntryActive]}>
            <View style={styles.liveEntryTop}>
              <View style={styles.liveInitBadge}><Text style={styles.liveInitValue}>{entry.initiative}</Text><Text style={styles.liveInitLabel}>INIZ</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.liveEntryName}>{entry.name}</Text>
                <Text style={styles.liveEntryMeta}>CA {entry.ac ?? '—'} · {entry.hp}/{entry.maxHp} PF · inflitti {entry.damageDealt} · subiti {entry.damageTaken}</Text>
              </View>
              <TouchableOpacity disabled={pending || blocked} onPress={() => removeEntry(entry)} style={styles.liveRemoveButton}>
                <Trash2 size={15} color={colors.parchmentMuted} />
              </TouchableOpacity>
            </View>
            <View style={styles.liveControlRow}>
              {[-5, -1, 1, 5].map((delta) => <TouchableOpacity key={delta} disabled={pending || blocked} style={styles.liveHpButton} onPress={() => adjustHp(entry, delta)}>
                <Text style={[styles.liveHpText, { color: delta < 0 ? colors.crimsonLight : colors.emerald }]}>{delta > 0 ? `+${delta}` : delta}</Text>
              </TouchableOpacity>)}
              <TouchableOpacity disabled={pending || blocked} style={[styles.liveHpButton, styles.liveKoButton]} onPress={() => adjustHp(entry, 'ko')}><Text style={styles.liveKoText}>K.O.</Text></TouchableOpacity>
            </View>
            <View style={styles.liveControlRow}>
              <TouchableOpacity disabled={pending || blocked} style={styles.liveDamageButton} onPress={() => void send('initiative.adjust_damage', { entry_id: entry.id, delta: -1 })}><Text style={styles.liveDamageText}>− Inflitti</Text></TouchableOpacity>
              <TouchableOpacity disabled={pending || blocked} style={styles.liveDamageButton} onPress={() => void send('initiative.adjust_damage', { entry_id: entry.id, delta: 1 })}><Text style={styles.liveDamageText}>+ Inflitti</Text></TouchableOpacity>
              <TouchableOpacity disabled={pending || blocked} style={styles.liveDamageButton} onPress={() => void send('initiative.adjust_damage_taken', { entry_id: entry.id, delta: -1 })}><Text style={styles.liveDamageText}>− Subiti</Text></TouchableOpacity>
              <TouchableOpacity disabled={pending || blocked} style={styles.liveDamageButton} onPress={() => void send('initiative.adjust_damage_taken', { entry_id: entry.id, delta: 1 })}><Text style={styles.liveDamageText}>+ Subiti</Text></TouchableOpacity>
            </View>
            <View style={styles.liveConditions}>
              {LIVE_CONDITIONS.map(([id, label]) => {
                const selected = entry.conditions?.includes(id) ?? false;
                return <TouchableOpacity key={id} disabled={pending || blocked} style={[styles.liveConditionChip, selected && styles.liveConditionSelected]} onPress={() => toggleCondition(entry, id)}>
                  <Text style={[styles.liveConditionText, selected && styles.liveConditionTextSelected]}>{label}</Text>
                </TouchableOpacity>;
              })}
            </View>
          </View>
        ))}

        {!!notice && <Text style={styles.liveNotice}>{notice}</Text>}
        {!!snapshot?.updatedAt && <Text style={styles.liveUpdated}>Aggiornato {new Date(snapshot.updatedAt).toLocaleTimeString()}{live.status === 'offline' ? ` · ${Math.max(0, Math.floor((Date.now() - new Date(snapshot.updatedAt).getTime()) / 1000))}s fa` : ''}</Text>}
      </ScrollView>

      <Modal visible={addModalVisible} transparent animationType="slide" onRequestClose={() => setAddModalVisible(false)}>
        <View style={styles.liveModalBackdrop}>
          <View style={styles.liveModalCard}>
            <Text style={styles.liveModalTitle}>Aggiungi mostro alla live</Text>
            <TextInput style={styles.liveInput} placeholder="Nome" placeholderTextColor={colors.parchmentMuted} value={newName} onChangeText={setNewName} />
            <TextInput style={styles.liveInput} placeholder="Punti ferita" placeholderTextColor={colors.parchmentMuted} keyboardType="number-pad" value={newHp} onChangeText={setNewHp} />
            <TextInput style={styles.liveInput} placeholder="Classe armatura" placeholderTextColor={colors.parchmentMuted} keyboardType="number-pad" value={newAc} onChangeText={setNewAc} />
            <TextInput style={styles.liveInput} placeholder="Iniziativa (inserita dal GM)" placeholderTextColor={colors.parchmentMuted} keyboardType="number-pad" value={newInitiative} onChangeText={setNewInitiative} />
            <View style={styles.liveModalButtons}>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}><Text style={styles.liveTimerAction}>Annulla</Text></TouchableOpacity>
              <TouchableOpacity disabled={blocked || pending} style={styles.liveAddButton} onPress={addEntry}><Text style={styles.liveAddText}>Invia al PC</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export const GmCombatTrackerScreen: React.FC = () => {
  return <GmLiveCombatTrackerScreen />;
};

const styles = StyleSheet.create({
  liveHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.stoneSurface, borderColor: colors.stoneBorder, borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 12 },
  liveHeaderEyebrow: { color: colors.brassLight, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  liveHeaderTitle: { color: colors.parchmentLight, fontSize: 16, fontWeight: '800', marginTop: 3 },
  liveHeaderSub: { color: colors.parchmentMuted, fontSize: 10, marginTop: 3 },
  liveError: { color: colors.crimsonLight, backgroundColor: 'rgba(239,68,68,0.12)', borderRadius: 7, padding: 10, fontSize: 11, marginBottom: 10 },
  liveWarning: { color: colors.brassLight, backgroundColor: 'rgba(201,156,74,0.12)', borderRadius: 7, padding: 10, fontSize: 11, marginBottom: 10 },
  liveRoundCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.stoneSurface, borderColor: colors.stoneBorder, borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 8 },
  liveRoundLabel: { color: colors.parchmentMuted, fontSize: 8, fontWeight: '800' },
  liveRoundNumber: { color: colors.brassLight, fontSize: 18, fontWeight: '900' },
  liveTurnButton: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 7, backgroundColor: colors.stone },
  liveTurnButtonText: { color: colors.parchmentLight, fontSize: 10, fontWeight: '800' },
  liveTurnPrimary: { backgroundColor: colors.brassBase },
  liveTurnPrimaryText: { color: colors.void },
  liveIconButton: { padding: 9 },
  liveTimerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.stoneSurface, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  liveTimerText: { color: colors.parchmentMuted, fontSize: 10 },
  liveTimerAction: { color: colors.brassLight, fontSize: 10, fontWeight: '800' },
  liveActionBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  liveCount: { color: colors.parchmentLight, fontSize: 12, fontWeight: '800' },
  liveAddButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: colors.brassBase, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 7 },
  liveAddText: { color: colors.void, fontSize: 10, fontWeight: '900' },
  liveSpotlight: { backgroundColor: colors.stoneSurface, borderColor: colors.brassDark, borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 10 },
  liveSpotlightLabel: { color: colors.brassLight, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  liveSpotlightName: { color: colors.parchmentLight, fontSize: 19, fontWeight: '900', marginVertical: 3 },
  liveSpotlightInfo: { color: colors.parchmentMuted, fontSize: 10 },
  liveEntryCard: { backgroundColor: colors.stoneSurface, borderColor: colors.stoneBorder, borderWidth: 1, borderRadius: 10, padding: 11, marginBottom: 8 },
  liveEntryActive: { borderColor: colors.brassBase },
  liveEntryTop: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 8 },
  liveInitBadge: { width: 39, height: 39, borderRadius: 8, backgroundColor: colors.stone, alignItems: 'center', justifyContent: 'center' },
  liveInitValue: { color: colors.brassLight, fontSize: 15, fontWeight: '900' },
  liveInitLabel: { color: colors.parchmentMuted, fontSize: 7, fontWeight: '800' },
  liveEntryName: { color: colors.parchmentLight, fontSize: 13, fontWeight: '800' },
  liveEntryMeta: { color: colors.parchmentMuted, fontSize: 9, marginTop: 3 },
  liveRemoveButton: { padding: 7 },
  liveControlRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 7 },
  liveHpButton: { minWidth: 43, alignItems: 'center', backgroundColor: colors.stone, borderRadius: 5, paddingHorizontal: 9, paddingVertical: 7 },
  liveHpText: { fontSize: 10, fontWeight: '900' },
  liveKoButton: { backgroundColor: 'rgba(239,68,68,0.18)' },
  liveKoText: { color: colors.crimsonLight, fontSize: 9, fontWeight: '900' },
  liveDamageButton: { flexGrow: 1, alignItems: 'center', backgroundColor: colors.stone, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 7, color: colors.parchmentMuted, fontSize: 9 },
  liveDamageText: { color: colors.parchmentMuted, fontSize: 9 },
  liveConditions: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, paddingTop: 2 },
  liveConditionChip: { borderWidth: 1, borderColor: colors.stoneBorder, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 4 },
  liveConditionSelected: { backgroundColor: 'rgba(201,156,74,0.2)', borderColor: colors.brassBase },
  liveConditionText: { color: colors.parchmentMuted, fontSize: 8 },
  liveConditionTextSelected: { color: colors.brassLight, fontWeight: '800' },
  liveNotice: { color: colors.brassLight, fontSize: 10, textAlign: 'center', marginTop: 8 },
  liveUpdated: { color: colors.parchmentMuted, fontSize: 9, textAlign: 'center', marginTop: 6, marginBottom: 12 },
  voiceCard: { backgroundColor: colors.stoneSurface, borderWidth: 1, borderColor: colors.brassDark, borderRadius: 12, padding: 14, marginBottom: 14, gap: 9 },
  voiceTitle: { color: colors.parchmentLight, fontSize: 16, fontWeight: '900' },
  voiceHint: { color: colors.parchmentMuted, fontSize: 12, lineHeight: 17 },
  voiceButton: { minHeight: 56, borderRadius: 10, backgroundColor: colors.brassBase, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 12 },
  voiceButtonPressed: { backgroundColor: colors.brassLight, opacity: 0.9 },
  voiceButtonText: { color: colors.void, fontSize: 14, fontWeight: '800' },
  voiceDisabled: { opacity: 0.45 },
  voiceMessage: { color: colors.crimsonLight, fontSize: 12, lineHeight: 17 },
  voiceLabel: { color: colors.parchmentLight, fontSize: 12, fontWeight: '700' },
  voiceInput: { minHeight: 80, textAlignVertical: 'top', color: colors.parchmentLight, backgroundColor: colors.void, borderWidth: 1, borderColor: colors.stoneBorder, borderRadius: 8, padding: 10, fontSize: 15, lineHeight: 21 },
  voiceModeRow: { flexDirection: 'row', gap: 8 },
  voiceModeButton: { flex: 1, minHeight: 48, borderWidth: 1, borderColor: colors.stoneBorder, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  voiceModeSelected: { backgroundColor: colors.brassBase, borderColor: colors.brassBase },
  voiceModeText: { color: colors.parchmentMuted, fontSize: 12, fontWeight: '700' },
  voiceModeTextSelected: { color: colors.void },
  voiceSendButton: { minHeight: 52, borderRadius: 8, backgroundColor: colors.brassBase, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  voiceSendText: { color: colors.void, fontSize: 14, fontWeight: '900' },
  commandReview: { backgroundColor: colors.void, borderRadius: 8, borderWidth: 1, borderColor: colors.stoneBorder, padding: 10, gap: 7 },
  commandStatus: { color: colors.brassLight, fontSize: 13, fontWeight: '900' },
  commandOperation: { color: colors.parchmentLight, fontSize: 12, lineHeight: 17 },
  commandOperationRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 4 },
  commandCheckbox: { width: 22, height: 22, borderWidth: 1, borderColor: colors.brassBase, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  commandCheckboxSelected: { backgroundColor: colors.brassBase },
  voiceConfirmButton: { minHeight: 52, borderRadius: 8, backgroundColor: colors.brassBase, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  commandReceipt: { color: colors.emerald, fontSize: 12, fontWeight: '800' },
  liveModalBackdrop: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.72)', padding: 18 },
  liveModalCard: { backgroundColor: colors.stoneSurface, borderWidth: 1, borderColor: colors.brassDark, borderRadius: 12, padding: 16, gap: 9 },
  liveModalTitle: { color: colors.parchmentLight, fontSize: 15, fontWeight: '900', marginBottom: 4 },
  liveInput: { color: colors.parchmentLight, backgroundColor: colors.stone, borderWidth: 1, borderColor: colors.stoneBorder, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 9, fontSize: 12 },
  liveModalButtons: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  safeArea: {
    flex: 1,
    backgroundColor: colors.void,
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  storageWarning: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.45)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  storageWarningText: {
    color: '#FCA5A5',
    fontSize: 13,
    lineHeight: 18,
  },
  roundCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.stoneSurface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.brassDark,
    padding: 14,
    marginBottom: 14,
  },
  roundLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roundLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.parchmentMuted,
    letterSpacing: 0.8,
  },
  roundCount: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.brassLight,
  },
  turnNavGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  prevTurnBtn: {
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 6,
  },
  prevTurnText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.parchmentLight,
  },
  nextTurnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.brassBase,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
  },
  nextTurnText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.void,
  },
  resetBtn: {
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 8,
    borderRadius: 6,
  },
  actionBar: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  actionBtnHero: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.brassDark,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionBtnHeroText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brassLight,
  },
  actionBtnMonster: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.brassBase,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionBtnMonsterText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.void,
  },
  spotlightCard: {
    backgroundColor: colors.stoneHighlight,
    borderWidth: 1.5,
    borderColor: colors.brassBase,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  spotlightTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  spotlightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.brassBase,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  spotlightBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.void,
    letterSpacing: 0.5,
  },
  spotlightInit: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brassLight,
  },
  spotlightName: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  spotlightStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  spotlightStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  spotlightStatText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.parchmentLight,
  },
  spotlightConditions: {
    flexDirection: 'row',
    gap: 6,
  },
  spotlightCondText: {
    fontSize: 10,
    color: colors.brassLight,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: colors.parchmentMuted,
  },
  combatantsCount: {
    fontSize: 10,
    color: colors.brassLight,
    fontWeight: '700',
  },
  combatantCard: {
    position: 'relative',
    backgroundColor: colors.stoneSurface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 10,
    marginBottom: 10,
  },
  combatantCardActive: {
    borderColor: colors.brassBase,
    backgroundColor: colors.stoneHighlight,
  },
  combatantCardDead: {
    opacity: 0.5,
  },
  activeTurnIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.brassBase,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  initBadge: {
    position: 'absolute',
    left: 10,
    top: 10,
    backgroundColor: colors.stone,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingHorizontal: 7,
    paddingVertical: 5,
    alignItems: 'center',
    minWidth: 38,
  },
  initBadgeActive: {
    borderColor: colors.brassBase,
    backgroundColor: colors.brassDark,
  },
  initNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  initNumberActive: {
    color: colors.brassLight,
  },
  initLabel: {
    fontSize: 7,
    fontWeight: '700',
    color: colors.parchmentMuted,
  },
  combatantMain: {
    marginLeft: 46,
    marginRight: 110,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  combatantName: {
    fontSize: 13,
    fontWeight: '700',
    maxWidth: '90%',
  },
  heroName: {
    color: colors.parchmentLight,
  },
  enemyName: {
    color: '#F87171',
  },
  deadText: {
    textDecorationLine: 'line-through',
  },
  deadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.crimson,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  deadBadgeText: {
    fontSize: 7,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  turnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.brassBase,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  turnBadgeText: {
    fontSize: 7,
    fontWeight: '800',
    color: colors.void,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statChipText: {
    fontSize: 10,
    color: colors.parchmentMuted,
  },
  activeCondBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  activeCondText: {
    fontSize: 8,
    fontWeight: '700',
  },
  cardRightControls: {
    position: 'absolute',
    right: 10,
    top: 8,
    bottom: 8,
    justifyContent: 'center',
    alignItems: 'flex-end',
    width: 110,
  },
  hpButtonGrid: {
    flexDirection: 'row',
    gap: 3,
    marginBottom: 6,
  },
  hpBtn: {
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingHorizontal: 4,
    paddingVertical: 3,
    borderRadius: 4,
    minWidth: 22,
    alignItems: 'center',
  },
  hpBtnText: {
    fontSize: 9,
    fontWeight: '800',
  },
  koBtn: {
    borderColor: colors.crimson,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  koBtnText: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.crimsonLight,
  },
  rowBelowHp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toggleCondBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.brassDark,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  toggleCondBtnActive: {
    backgroundColor: colors.brassDark,
  },
  toggleCondBtnText: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.brassLight,
  },
  deleteBtn: {
    padding: 3,
  },
  conditionsTray: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.stoneBorder,
  },
  conditionsTrayTitle: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.brassLight,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  conditionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  conditionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.stone,
  },
  condCheckDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.stoneBorder,
  },
  conditionPillText: {
    fontSize: 9,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.stoneSurface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.brassDark,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.brassLight,
    letterSpacing: 0.8,
  },
  templateLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.parchmentMuted,
    marginBottom: 6,
  },
  templateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  templateChip: {
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  templateChipText: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.parchmentLight,
  },
  formGroup: {
    marginBottom: 10,
  },
  formLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.parchmentMuted,
    marginBottom: 4,
  },
  formInput: {
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.parchmentLight,
  },
  formThreeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  formCol: {
    flex: 1,
  },
  formInputSmall: {
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '700',
    color: colors.brassLight,
    textAlign: 'center',
  },
  enemyToggleRow: {
    marginBottom: 16,
  },
  factionOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  factionChip: {
    flex: 1,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  factionChipEnemy: {
    borderColor: colors.crimson,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  factionChipAlly: {
    borderColor: colors.brassLight,
    backgroundColor: 'rgba(243, 210, 122, 0.15)',
  },
  factionChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.parchmentMuted,
  },
  factionTextActive: {
    color: colors.parchmentLight,
  },
  addSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.brassBase,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addSubmitBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.void,
    letterSpacing: 0.8,
  },
  emptyCard: {
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.parchmentLight,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.parchmentMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default GmCombatTrackerScreen;
