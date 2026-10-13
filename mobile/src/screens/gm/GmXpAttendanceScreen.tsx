import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import {
  Award,
  CheckCircle2,
  XCircle,
  Users,
  Sparkles,
  Save,
  Plus,
  Minus,
  ChevronDown,
  Calendar,
  ShieldCheck,
  Check,
  RefreshCw,
  Coins,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useGmCampaigns } from '../../hooks/useGmCampaigns';
import { CampaignSelectorModal } from '../../components/common/CampaignSelectorModal';
import { GmCreateSessionModal } from '../../components/gm/GmCreateSessionModal';
import { GmSessionSignupsModal } from '../../components/gm/GmSessionSignupsModal';
import { GmSessionsManagerModal } from '../../components/gm/GmSessionsManagerModal';
import { supabase } from '../../api/supabase';
import { Character, Session } from '../../types';
import { useRoute, type RouteProp } from '@react-navigation/native';
import type { GmTabParamList } from '../../navigation/GmTabNavigator';

interface ParticipantRow {
  key: string;
  characterId: string;
  characterName: string;
  characterClass: string;
  characterLevel: number;
  playerId: string;
  currentXp: number;
  present: boolean;
  bonusXp: number;
  tags: string[];
}

export const GmXpAttendanceScreen: React.FC = () => {
  const route = useRoute<RouteProp<GmTabParamList, 'GmXpAttendance'>>();
  const appliedNotificationSession = useRef<string | null>(null);
  const {
    campaigns,
    activeCampaign,
    selectCampaign,
    sessions,
    activeSession,
    selectSession,
    characters,
    refreshSessionData,
  } = useGmCampaigns();

  useEffect(() => {
    const id = route.params?.notificationSessionId;
    if (id && appliedNotificationSession.current !== id && sessions.some(session => session.id === id)) {
      selectSession(id);
      appliedNotificationSession.current = id;
    }
  }, [route.params?.notificationSessionId, sessions, selectSession]);

  const draftRevision = useRef<number | null>(null);
  const webAppUrl = (process.env.EXPO_PUBLIC_WEB_APP_URL || 'https://barberanddragons.com').replace(/\/$/, '');
  async function draftRequest(sessionId: string, method = 'GET', body?: unknown) {
    const {data: {session}} = await supabase.auth.getSession();
    if (!session) throw new Error('Accesso scaduto. Accedi di nuovo.');
    const response = await fetch(`${webAppUrl}/api/sessions/${sessionId}/xp-draft`, {
      method, headers: {Authorization:`Bearer ${session.access_token}`, 'Content-Type':'application/json'},
      ...(body ? {body:JSON.stringify(body)} : {}),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Bozza non disponibile.');
    return data;
  }
  const [baseXpInput, setBaseXpInput] = useState<string>('200');
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [sessionFilter, setSessionFilter] = useState<'all' | 'open' | 'recent'>('open');
  const [campaignModalVisible, setCampaignModalVisible] = useState<boolean>(false);
  const [sessionModalVisible, setSessionModalVisible] = useState<boolean>(false);
  const [createSessionModalVisible, setCreateSessionModalVisible] = useState<boolean>(false);
  const [signupsModalVisible, setSignupsModalVisible] = useState<boolean>(false);
  const [sessionsManagerModalVisible, setSessionsManagerModalVisible] = useState<boolean>(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  // Filter sessions based on tab
  const filteredSessions = useMemo(() => {
    if (sessionFilter === 'open') {
      const openOnes = sessions.filter((s) => s.status === 'scheduled');
      return openOnes.length > 0 ? openOnes : sessions;
    }
    if (sessionFilter === 'recent') {
      return [...sessions].slice(0, 5);
    }
    return sessions;
  }, [sessions, sessionFilter]);

  // Load signups & map characters whenever activeSession or characters change
  useEffect(() => {
    let isCancelled = false;

    async function loadSignupsAndMap() {
      if (!activeSession) {
        setParticipants([]);
        return;
      }

      draftRevision.current = null;
      let draft: any = null;
      // Check signups from DB
      let signupsMap = new Map<string, string>(); // playerId -> status
      if (!activeSession.id.startsWith('demo-')) {
        try {
          const shared = await draftRequest(activeSession.id);
          if (isCancelled) return;
          draftRevision.current = shared.revision;
          draft = shared.draft;
          if (draft) setBaseXpInput(String(draft.xpGained ?? 0));
          const { data: signups } = await supabase
            .from('session_signups')
            .select('player_id, status')
            .eq('session_id', activeSession.id)
            .in('status', ['approved','confirmed','attended','absent']);

          if (signups && signups.length > 0) {
            signups.forEach((s: any) => {
              if (s.player_id) signupsMap.set(s.player_id, s.status);
            });
          }
        } catch (e) {
          console.warn('[GmXpAttendance] Error fetching signups:', e);
        }
      }

      if (isCancelled) return;

      // Build participant rows from campaign characters
      const rows: ParticipantRow[] = characters.filter(c => activeSession.id.startsWith('demo-') || (c.assigned_to && signupsMap.has(c.assigned_to))).map((c: Character, idx: number) => {
        const pId = c.assigned_to || `player-anon-${c.id}`;
        const existingStatus = signupsMap.get(pId);
        const isPresent = (draft?.attendance?.[pId] ?? existingStatus) !== 'absent';

        return {
          key: c.id,
          characterId: c.id,
          characterName: c.name,
          characterClass: c.character_class
            ? `${c.character_class}${c.class_subclass ? ` (${c.class_subclass})` : ''}`
            : 'Avventuriero',
          characterLevel: c.level || 1,
          playerId: pId,
          currentXp: c.current_xp || 0,
          present: isPresent,
          bonusXp: draft ? ((draft.perPlayerXpAwards?.find((a: any) => a.playerId === pId)?.xp ?? draft.xpGained ?? 0) - (draft.xpGained ?? 0)) : 0,
          tags: [],
        };
      });

      setParticipants(rows);
    }

    void loadSignupsAndMap();

    return () => {
      isCancelled = true;
    };
  }, [activeSession, characters]);

  // Toggle single attendance
  const toggleAttendance = (characterId: string) => {
    setParticipants((prev) =>
      prev.map((p) => (p.characterId === characterId ? { ...p, present: !p.present } : p))
    );
  };

  // Set all attendance
  const setAllAttendance = (present: boolean) => {
    setParticipants((prev) => prev.map((p) => ({ ...p, present })));
  };

  // Add individual bonus
  const addBonus = (characterId: string, amount: number, label?: string) => {
    setParticipants((prev) =>
      prev.map((p) => {
        if (p.characterId !== characterId) return p;
        const newBonus = Math.max(0, p.bonusXp + amount);
        let newTags = [...p.tags];
        if (label && amount > 0 && !newTags.includes(label)) {
          newTags.push(label);
        } else if (newBonus === 0) {
          newTags = [];
        }
        return { ...p, bonusXp: newBonus, tags: newTags };
      })
    );
  };

  // Add group bonus
  const addGroupBonus = (amount: number, label: string) => {
    setParticipants((prev) =>
      prev.map((p) => {
        if (!p.present) return p;
        const newTags = p.tags.includes(label) ? p.tags : [...p.tags, label];
        return { ...p, bonusXp: p.bonusXp + amount, tags: newTags };
      })
    );
  };

  // Reset bonus for single player
  const resetBonus = (characterId: string) => {
    setParticipants((prev) =>
      prev.map((p) => (p.characterId === characterId ? { ...p, bonusXp: 0, tags: [] } : p))
    );
  };

  const parsedBaseXp = Math.max(0, parseInt(baseXpInput, 10) || 0);
  const presentCount = participants.filter((p) => p.present).length;
  const totalSessionXpDistributed = participants.reduce((acc, p) => {
    return acc + (p.present ? parsedBaseXp + p.bonusXp : 0);
  }, 0);

  // Save attendance & XP to Supabase
  const handleSaveAndDistribute = () => {
    if (!activeSession) {
      Alert.alert('Nessuna sessione', 'Seleziona prima una sessione valida.');
      return;
    }

    Alert.alert(
      'Salva bozza EXP',
      `Salverai gli importi di ${presentCount} presenti. L’EXP verrà assegnata solo alla chiusura definitiva dal PC.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Salva bozza',
          style: 'default',
          onPress: async () => {
            setIsSaving(true);
            setSaveSuccessNotice(null);

            try {
              const isDemo = activeSession.id.startsWith('demo-');

              if (!isDemo) {
                if (draftRevision.current == null) throw new Error('Ricarica la sessione prima di salvare.');
                const registered = participants.filter(p => !p.playerId.startsWith('player-anon-'));
                const data = await draftRequest(activeSession.id, 'PUT', {
                  expectedRevision:draftRevision.current,
                  draft:{attendance:Object.fromEntries(registered.map(p => [p.playerId,p.present ? 'attended' : 'absent'])),
                    xpGained:Math.max(0,parsedBaseXp),
                    perPlayerXpAwards:registered.filter(p => p.present).map(p => ({playerId:p.playerId,xp:Math.max(0,parsedBaseXp+p.bonusXp)}))},
                });
                draftRevision.current = data.revision;
              }

              // Refresh context
              await refreshSessionData();

              setSaveSuccessNotice(
                `Bozza salvata: ${presentCount} presenti, ${totalSessionXpDistributed} EXP da assegnare alla chiusura.`
              );
              Alert.alert(
                'Bozza salvata',
                `Completa la chiusura dal PC per assegnare l’EXP.`
              );
            } catch (err: any) {
              console.error('[GmXpAttendance] save error:', err);
              Alert.alert('Errore nel salvataggio', err?.message || 'Riprova più tardi.');
            } finally {
              setIsSaving(false);
            }
          },
        },
      ]
    );
  };

  const formatSessionDate = (dateStr?: string) => {
    if (!dateStr) return 'Data da definire';
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString('it-IT', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Campaign & Session Selector Bar */}
        <View style={styles.selectorsCard}>
          {/* Campaign Selector Row */}
          <View style={styles.selectorItem}>
            <Text style={styles.selectorLabel}>CAMPAGNA</Text>
            <TouchableOpacity
              style={styles.dropdownBtn}
              onPress={() => setCampaignModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.dropdownBtnText} numberOfLines={1}>
                {activeCampaign?.name || 'Seleziona Campagna'}
              </Text>
              <ChevronDown size={16} color={colors.brassLight} />
            </TouchableOpacity>
          </View>

          {/* Session Selector Row */}
          <View style={styles.selectorItem}>
            <View style={styles.sessionHeaderRow}>
              <Text style={styles.selectorLabel}>SESSIONE</Text>
              {/* Quick filter tabs */}
              <View style={styles.filterPills}>
                <TouchableOpacity
                  style={[styles.filterPill, sessionFilter === 'open' && styles.filterPillActive]}
                  onPress={() => setSessionFilter('open')}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      sessionFilter === 'open' && styles.filterPillTextActive,
                    ]}
                  >
                    Aperte
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterPill, sessionFilter === 'recent' && styles.filterPillActive]}
                  onPress={() => setSessionFilter('recent')}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      sessionFilter === 'recent' && styles.filterPillTextActive,
                    ]}
                  >
                    Recenti
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterPill, sessionFilter === 'all' && styles.filterPillActive]}
                  onPress={() => setSessionFilter('all')}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      sessionFilter === 'all' && styles.filterPillTextActive,
                    ]}
                  >
                    Tutte
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.dropdownBtn}
              onPress={() => setSessionModalVisible(true)}
              activeOpacity={0.8}
            >
              <View style={styles.sessionDropdownContent}>
                <Calendar size={14} color={colors.brassLight} />
                <Text style={styles.dropdownBtnText} numberOfLines={1}>
                  {activeSession?.title || 'Nessuna sessione'} (
                  {formatSessionDate(activeSession?.scheduled_at)})
                </Text>
              </View>
              <ChevronDown size={16} color={colors.brassLight} />
            </TouchableOpacity>

            {/* Quick Actions for Session */}
            <View style={styles.sessionQuickBar}>
              {activeSession && (
                <TouchableOpacity
                  style={styles.quickSignupsBtn}
                  onPress={() => setSignupsModalVisible(true)}
                  activeOpacity={0.75}
                >
                  <Users size={12} color={colors.brassLight} />
                  <Text style={styles.quickSignupsBtnText}>Iscritti Tavolo</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.quickCreateBtn}
                onPress={() => setCreateSessionModalVisible(true)}
                activeOpacity={0.8}
              >
                <Plus size={12} color={colors.void} />
                <Text style={styles.quickCreateBtnText}>+ Crea Sessione</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickCalendarBtn}
                onPress={() => setSessionsManagerModalVisible(true)}
                activeOpacity={0.75}
              >
                <Calendar size={12} color={colors.parchmentMuted} />
                <Text style={styles.quickCalendarBtnText}>Tutti i Tavoli</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Base XP Setup Card */}
        <View style={styles.setupCard}>
          <View style={styles.setupTop}>
            <Award size={18} color={colors.brassLight} />
            <Text style={styles.setupTitle}>XP BASE DI SESSIONE</Text>
          </View>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.xpInput}
              keyboardType="number-pad"
              value={baseXpInput}
              onChangeText={setBaseXpInput}
              placeholder="200"
              placeholderTextColor={colors.parchmentMuted}
            />
            <View style={styles.presetRow}>
              {[150, 200, 300, 450].map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[
                    styles.presetChip,
                    parsedBaseXp === val && styles.presetChipActive,
                  ]}
                  onPress={() => setBaseXpInput(val.toString())}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      parsedBaseXp === val && styles.presetChipTextActive,
                    ]}
                  >
                    {val}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Group Bonus Shortcuts */}
          <View style={styles.groupBonusRow}>
            <Text style={styles.groupBonusLabel}>Bonus Collettivo Tavolo:</Text>
            <View style={styles.groupBonusBtns}>
              <TouchableOpacity
                style={styles.groupBonusBtn}
                onPress={() => addGroupBonus(50, 'Vittoria Epica +50')}
              >
                <Sparkles size={11} color={colors.brassLight} />
                <Text style={styles.groupBonusBtnText}>+50 a Tutti</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.groupBonusBtn}
                onPress={() => addGroupBonus(100, 'Boss Sconfitto +100')}
              >
                <Sparkles size={11} color={colors.brassLight} />
                <Text style={styles.groupBonusBtnText}>+100 a Tutti</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Summary Stats Strip */}
          <View style={styles.summaryStatsStrip}>
            <View style={styles.summaryStatItem}>
              <Text style={styles.summaryStatNum}>{presentCount}</Text>
              <Text style={styles.summaryStatLabel}>Presenti</Text>
            </View>
            <View style={styles.summaryStatDivider} />
            <View style={styles.summaryStatItem}>
              <Text style={styles.summaryStatNum}>{participants.length - presentCount}</Text>
              <Text style={styles.summaryStatLabel}>Assenti</Text>
            </View>
            <View style={styles.summaryStatDivider} />
            <View style={styles.summaryStatItem}>
              <Text style={[styles.summaryStatNum, { color: colors.brassLight }]}>
                {totalSessionXpDistributed}
              </Text>
              <Text style={styles.summaryStatLabel}>EXP nella bozza</Text>
            </View>
          </View>
        </View>

        {/* Players Attendance Section Header */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <Users size={16} color={colors.brassBase} />
            <Text style={styles.sectionTitle}>APPELLO DEL PARTY ({participants.length})</Text>
          </View>
          <View style={styles.bulkPresenceRow}>
            <TouchableOpacity onPress={() => setAllAttendance(true)} style={styles.bulkBtn}>
              <Text style={styles.bulkBtnText}>Tutti Presenti</Text>
            </TouchableOpacity>
            <Text style={styles.bulkSep}>•</Text>
            <TouchableOpacity onPress={() => setAllAttendance(false)} style={styles.bulkBtn}>
              <Text style={styles.bulkBtnText}>Tutti Assenti</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Players List */}
        {participants.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Nessun personaggio trovato</Text>
            <Text style={styles.emptySub}>
              Crea o assegna personaggi alla campagna per registrare le presenze al tavolo.
            </Text>
          </View>
        ) : (
          participants.map((player) => {
            const totalEarned = player.present ? parsedBaseXp + player.bonusXp : 0;
            const previewNewXp = player.currentXp + totalEarned;

            return (
              <View
                key={player.key}
                style={[
                  styles.playerCard,
                  !player.present && styles.playerCardAbsent,
                ]}
              >
                <View style={styles.playerMainRow}>
                  {/* Presence Checkbox Button */}
                  <TouchableOpacity
                    style={styles.presenceToggleBtn}
                    onPress={() => toggleAttendance(player.characterId)}
                    activeOpacity={0.7}
                  >
                    {player.present ? (
                      <CheckCircle2 size={24} color={colors.emerald} />
                    ) : (
                      <XCircle size={24} color={colors.parchmentMuted} />
                    )}
                  </TouchableOpacity>

                  {/* Character Info */}
                  <View style={styles.playerInfo}>
                    <Text
                      style={[
                        styles.charName,
                        !player.present && styles.charNameAbsent,
                      ]}
                      numberOfLines={1}
                    >
                      {player.characterName}
                    </Text>
                    <Text style={styles.charClass}>
                      {player.characterClass} • Liv {player.characterLevel}
                    </Text>
                    <Text style={styles.sheetXp}>
                      Scheda: {player.currentXp} XP → Nuovi:{' '}
                      <Text style={{ color: player.present ? colors.emerald : colors.parchmentMuted }}>
                        {previewNewXp} XP
                      </Text>
                    </Text>
                  </View>

                  {/* Total XP Badge */}
                  <View style={styles.xpEarnedBox}>
                    <Text
                      style={[
                        styles.xpEarnedNumber,
                        !player.present && styles.xpEarnedNumberAbsent,
                      ]}
                    >
                      +{totalEarned}
                    </Text>
                    <Text style={styles.xpEarnedLabel}>XP Sessione</Text>
                  </View>
                </View>

                {/* Individual Bonuses row (Visible only if present) */}
                {player.present && (
                  <View style={styles.bonusRow}>
                    <View style={styles.bonusLabelsGroup}>
                      <Text style={styles.bonusLabel}>Bonus Personali:</Text>
                      {player.tags.length > 0 && (
                        <View style={styles.tagChips}>
                          {player.tags.map((t, idx) => (
                            <View key={idx} style={styles.tagBadge}>
                              <Text style={styles.tagBadgeText}>{t}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>

                    <View style={styles.bonusControls}>
                      <TouchableOpacity
                        style={styles.bonusBtn}
                        onPress={() => addBonus(player.characterId, 50, 'MVP +50')}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.bonusBtnText}>+50 MVP</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.bonusBtn}
                        onPress={() => addBonus(player.characterId, 100, 'Ruolo +100')}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.bonusBtnText}>+100 Ruolo</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.bonusBtn}
                        onPress={() => addBonus(player.characterId, 50, 'Lotta +50')}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.bonusBtnText}>+50 Lotta</Text>
                      </TouchableOpacity>

                      {player.bonusXp > 0 && (
                        <TouchableOpacity
                          style={styles.bonusResetBtn}
                          onPress={() => resetBonus(player.characterId)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.bonusResetText}>Reset</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}

        {/* Success Notice if saved */}
        {saveSuccessNotice && (
          <View style={styles.successBanner}>
            <ShieldCheck size={18} color={colors.emerald} />
            <Text style={styles.successBannerText}>{saveSuccessNotice}</Text>
          </View>
        )}

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
          onPress={handleSaveAndDistribute}
          disabled={isSaving}
          activeOpacity={0.85}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.void} />
          ) : (
            <>
              <Save size={18} color={colors.void} />
              <Text style={styles.saveBtnText}>
                SALVA BOZZA EXP ({totalSessionXpDistributed} EXP)
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Campaign Selection Modal */}
      <CampaignSelectorModal
        visible={campaignModalVisible}
        onClose={() => setCampaignModalVisible(false)}
      />

      {/* Session Selection Modal */}
      <Modal
        visible={sessionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSessionModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSessionModalVisible(false)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>SELEZIONA SESSIONE</Text>
            <ScrollView style={{ maxHeight: 350 }}>
              {filteredSessions.map((s) => {
                const isSelected = s.id === activeSession?.id;
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.modalOption, isSelected && styles.modalOptionActive]}
                    onPress={() => {
                      selectSession(s.id);
                      setSessionModalVisible(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.modalOptionText,
                          isSelected && styles.modalOptionTextActive,
                        ]}
                      >
                        {s.title || 'Sessione senza titolo'}
                      </Text>
                      <Text style={styles.modalOptionSub}>
                        {formatSessionDate(s.scheduled_at)} •{' '}
                        {s.status === 'scheduled' ? 'In programma' : 'Completata'}
                      </Text>
                    </View>
                    {isSelected && <Check size={16} color={colors.brassLight} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Create New Session Modal */}
      <GmCreateSessionModal
        visible={createSessionModalVisible}
        onClose={() => setCreateSessionModalVisible(false)}
        campaignId={activeCampaign?.id}
        onSessionCreated={() => {
          refreshSessionData();
        }}
      />

      {/* Active Session Signups Modal */}
      {activeSession && (
        <GmSessionSignupsModal
          visible={signupsModalVisible}
          onClose={() => setSignupsModalVisible(false)}
          session={activeSession}
          onSignupsUpdated={() => {
            refreshSessionData();
          }}
        />
      )}

      {/* All Sessions Calendar & Signups Manager */}
      <GmSessionsManagerModal
        visible={sessionsManagerModalVisible}
        onClose={() => setSessionsManagerModalVisible(false)}
        campaignId={activeCampaign?.id}
        campaignTitle={activeCampaign?.name}
        onRequestCreateSession={() => {
          setCreateSessionModalVisible(true);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.void,
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  selectorsCard: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.brassDark,
    padding: 14,
    marginBottom: 16,
    gap: 12,
  },
  selectorItem: {
    gap: 4,
  },
  selectorLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.parchmentMuted,
    letterSpacing: 0.8,
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sessionDropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  dropdownBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.parchmentLight,
    flex: 1,
  },
  sessionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterPills: {
    flexDirection: 'row',
    gap: 4,
  },
  filterPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.stone,
  },
  filterPillActive: {
    backgroundColor: colors.brassDark,
  },
  filterPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.parchmentMuted,
  },
  filterPillTextActive: {
    color: colors.brassLight,
  },
  sessionQuickBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
    alignItems: 'center',
  },
  quickSignupsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.brassDark,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  quickSignupsBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brassLight,
  },
  quickCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.brassBase,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  quickCreateBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.void,
  },
  quickCalendarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  quickCalendarBtnText: {
    fontSize: 10,
    color: colors.parchmentMuted,
    fontWeight: '600',
  },
  setupCard: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 14,
    marginBottom: 18,
  },
  setupTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  setupTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.brassLight,
    letterSpacing: 0.8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  xpInput: {
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.brassDark,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 20,
    fontWeight: '800',
    color: colors.brassLight,
    width: 100,
    textAlign: 'center',
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  presetChip: {
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
  },
  presetChipActive: {
    backgroundColor: colors.brassBase,
    borderColor: colors.brassLight,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.parchmentMuted,
  },
  presetChipTextActive: {
    color: colors.void,
  },
  groupBonusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.stoneBorder,
  },
  groupBonusLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.parchmentMuted,
  },
  groupBonusBtns: {
    flexDirection: 'row',
    gap: 6,
  },
  groupBonusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.brassDark,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  groupBonusBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brassLight,
  },
  summaryStatsStrip: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: colors.stone,
    borderRadius: 8,
    paddingVertical: 8,
    marginTop: 8,
  },
  summaryStatItem: {
    alignItems: 'center',
  },
  summaryStatNum: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  summaryStatLabel: {
    fontSize: 9,
    color: colors.parchmentMuted,
    marginTop: 1,
  },
  summaryStatDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.stoneBorder,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: colors.parchmentMuted,
  },
  bulkPresenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bulkBtn: {
    paddingVertical: 2,
  },
  bulkBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brassLight,
  },
  bulkSep: {
    fontSize: 10,
    color: colors.parchmentMuted,
  },
  emptyCard: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.parchmentLight,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: colors.parchmentMuted,
    textAlign: 'center',
  },
  playerCard: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 12,
    marginBottom: 10,
  },
  playerCardAbsent: {
    opacity: 0.5,
  },
  playerMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  presenceToggleBtn: {
    padding: 2,
  },
  playerInfo: {
    flex: 1,
  },
  charName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.parchmentLight,
  },
  charNameAbsent: {
    textDecorationLine: 'line-through',
  },
  charClass: {
    fontSize: 11,
    color: colors.parchmentMuted,
    marginTop: 1,
  },
  sheetXp: {
    fontSize: 10,
    color: colors.parchmentMuted,
    marginTop: 2,
  },
  xpEarnedBox: {
    alignItems: 'flex-end',
  },
  xpEarnedNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.brassLight,
  },
  xpEarnedNumberAbsent: {
    color: colors.parchmentMuted,
  },
  xpEarnedLabel: {
    fontSize: 8,
    color: colors.parchmentMuted,
  },
  bonusRow: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.stoneBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  bonusLabelsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  bonusLabel: {
    fontSize: 10,
    color: colors.parchmentMuted,
  },
  tagChips: {
    flexDirection: 'row',
    gap: 4,
  },
  tagBadge: {
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.brassDark,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  tagBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.brassLight,
  },
  bonusControls: {
    flexDirection: 'row',
    gap: 6,
  },
  bonusBtn: {
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.brassDark,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bonusBtnText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.brassLight,
  },
  bonusResetBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  bonusResetText: {
    fontSize: 9,
    color: colors.crimsonLight,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: colors.emerald,
    borderRadius: 8,
    padding: 12,
    marginVertical: 10,
  },
  successBannerText: {
    fontSize: 12,
    color: colors.emerald,
    fontWeight: '700',
    flex: 1,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.brassBase,
    paddingVertical: 15,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.brassLight,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: colors.void,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.stoneSurface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.brassDark,
    padding: 16,
  },
  modalTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.brassLight,
    letterSpacing: 1,
    marginBottom: 12,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.stoneBorder,
  },
  modalOptionActive: {
    backgroundColor: colors.stone,
    borderRadius: 6,
  },
  modalOptionText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.parchmentLight,
  },
  modalOptionTextActive: {
    color: colors.brassLight,
  },
  modalOptionSub: {
    fontSize: 11,
    color: colors.parchmentMuted,
    marginTop: 2,
  },
});

export default GmXpAttendanceScreen;
