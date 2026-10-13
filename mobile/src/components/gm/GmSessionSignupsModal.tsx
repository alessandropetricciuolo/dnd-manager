import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import {
  X,
  Users,
  Calendar,
  Clock,
  MapPin,
  Shield,
  CheckCircle2,
  XCircle,
  UserPlus,
  Trash2,
  Crown,
  Heart,
  AlertTriangle,
  RotateCcw,
  Check,
  ChevronRight,
  Plus,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useGmCampaigns } from '../../hooks/useGmCampaigns';
import {
  Session,
  SessionSignupDetail,
  SessionSignupStatus,
} from '../../types';
import { GmCampaignCandidate } from '../../contexts/GmCampaignContext';

interface GmSessionSignupsModalProps {
  visible: boolean;
  session: Session | null;
  onClose: () => void;
  onSessionUpdated?: () => void;
  onSignupsUpdated?: () => void;
}

type FilterTab = 'all' | 'approved' | 'pending' | 'other';

export const GmSessionSignupsModal: React.FC<GmSessionSignupsModalProps> = ({
  visible,
  session,
  onClose,
  onSessionUpdated,
  onSignupsUpdated,
}) => {
  const {
    fetchSessionSignups,
    updateSignupStatus,
    removeSignup,
    addPlayerToSession,
    fetchCampaignCandidates,
    updateSession,
    deleteSession,
  } = useGmCampaigns();

  const [signups, setSignups] = useState<SessionSignupDetail[]>([]);
  const [candidates, setCandidates] = useState<GmCampaignCandidate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [addPlayerModalVisible, setAddPlayerModalVisible] = useState<boolean>(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Load signups for the session
  const loadData = useCallback(async () => {
    if (!session?.id) return;
    try {
      setLoading(true);
      const data = await fetchSessionSignups(session.id);
      setSignups(data);

      const cand = await fetchCampaignCandidates(session.id);
      setCandidates(cand);
    } catch (e) {
      console.warn('[GmSessionSignupsModal] loadData catch:', e);
    } finally {
      setLoading(false);
    }
  }, [session?.id, fetchSessionSignups, fetchCampaignCandidates]);

  useEffect(() => {
    if (visible && session?.id) {
      void loadData();
    }
  }, [visible, session?.id, loadData]);

  if (!session) return null;

  // Format date
  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('it-IT', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // Counts
  const approvedSignups = signups.filter(
    (s) => s.status === 'approved' || s.status === 'confirmed' || s.status === 'attended'
  );
  const pendingSignups = signups.filter((s) => s.status === 'pending' || s.status === 'waitlist');
  const otherSignups = signups.filter(
    (s) => s.status === 'rejected' || s.status === 'absent' || s.status === 'cancelled'
  );

  const maxPlayers = session.max_players || 6;
  const isFull = approvedSignups.length >= maxPlayers;
  const capacityPercent = Math.min(100, Math.round((approvedSignups.length / maxPlayers) * 100));

  // Filtered list
  const filteredList = signups.filter((s) => {
    if (filterTab === 'approved') {
      return s.status === 'approved' || s.status === 'confirmed' || s.status === 'attended';
    }
    if (filterTab === 'pending') {
      return s.status === 'pending' || s.status === 'waitlist';
    }
    if (filterTab === 'other') {
      return s.status === 'rejected' || s.status === 'absent' || s.status === 'cancelled';
    }
    return true;
  });

  const notifyChanges = () => {
    if (onSessionUpdated) onSessionUpdated();
    if (onSignupsUpdated) onSignupsUpdated();
  };

  // Action: Update signup status
  const handleStatusChange = async (signupId: string, newStatus: SessionSignupStatus) => {
    try {
      setProcessingId(signupId);
      const res = await updateSignupStatus(signupId, newStatus);
      if (res.success) {
        setSignups((prev) =>
          prev.map((s) => (s.id === signupId ? { ...s, status: newStatus } : s))
        );
        notifyChanges();
      } else {
        Alert.alert('Errore', res.error || 'Impossibile aggiornare lo stato dell’iscritto.');
      }
    } catch (e: any) {
      Alert.alert('Errore', e?.message || 'Riprova più tardi.');
    } finally {
      setProcessingId(null);
    }
  };

  // Action: Remove signup completely
  const handleRemoveSignup = (signup: SessionSignupDetail) => {
    const name = signup.character?.name || signup.playerProfile?.display_name || 'questo giocatore';
    Alert.alert(
      'Rimuovere Iscritto?',
      `Vuoi rimuovere ${name} dalla sessione? Il posto verrà liberato.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Rimuovi',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessingId(signup.id);
              const res = await removeSignup(signup.id);
              if (res.success) {
                setSignups((prev) => prev.filter((s) => s.id !== signup.id));
                void loadData();
                notifyChanges();
              } else {
                Alert.alert('Errore', res.error || 'Impossibile rimuovere l’iscritto.');
              }
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  // Action: Add candidate manually
  const handleAddCandidate = async (candidate: GmCampaignCandidate) => {
    try {
      setProcessingId(candidate.playerId);
      const res = await addPlayerToSession(session.id, candidate.playerId);
      if (res.success) {
        setAddPlayerModalVisible(false);
        await loadData();
        notifyChanges();
      } else {
        Alert.alert('Errore', res.error || 'Impossibile aggiungere il giocatore.');
      }
    } finally {
      setProcessingId(null);
    }
  };

  // Action: Complete or Cancel Session
  const handleToggleSessionStatus = (newStatus: 'scheduled' | 'completed' | 'cancelled') => {
    const labels = {
      completed: 'Completare la sessione?',
      cancelled: 'Annullare la sessione?',
      scheduled: 'Riaprire la sessione come programmata?',
    };
    Alert.alert(
      'Modifica Stato Sessione',
      labels[newStatus],
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Conferma',
          style: newStatus === 'cancelled' ? 'destructive' : 'default',
          onPress: async () => {
            const res = await updateSession(session.id, { status: newStatus });
            if (res.success) {
              notifyChanges();
              onClose();
            } else {
              Alert.alert('Errore', res.error || 'Impossibile aggiornare lo stato.');
            }
          },
        },
      ]
    );
  };

  // Action: Delete session
  const handleDeleteSession = () => {
    Alert.alert(
      'Eliminare Definitivamente la Sessione?',
      'Questa azione cancellerà la sessione dal calendario e tutte le iscrizioni associate. Questa operazione non può essere annullata.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina Definitivamente',
          style: 'destructive',
          onPress: async () => {
            const res = await deleteSession(session.id);
            if (res.success) {
              notifyChanges();
              onClose();
            } else {
              Alert.alert('Errore', res.error || 'Impossibile eliminare la sessione.');
            }
          },
        },
      ]
    );
  };

  const renderStatusBadge = (status: SessionSignupStatus) => {
    switch (status) {
      case 'approved':
      case 'confirmed':
        return (
          <View style={[styles.badge, styles.badgeApproved]}>
            <CheckCircle2 size={11} color={colors.emerald} />
            <Text style={[styles.badgeText, { color: colors.emerald }]}>Confermato</Text>
          </View>
        );
      case 'attended':
        return (
          <View style={[styles.badge, styles.badgeAttended]}>
            <Crown size={11} color={colors.brassLight} />
            <Text style={[styles.badgeText, { color: colors.brassLight }]}>Presente</Text>
          </View>
        );
      case 'pending':
      case 'waitlist':
        return (
          <View style={[styles.badge, styles.badgePending]}>
            <Clock size={11} color="#F59E0B" />
            <Text style={[styles.badgeText, { color: '#F59E0B' }]}>In Attesa</Text>
          </View>
        );
      case 'rejected':
      case 'cancelled':
        return (
          <View style={[styles.badge, styles.badgeRejected]}>
            <XCircle size={11} color={colors.crimsonBase} />
            <Text style={[styles.badgeText, { color: colors.crimsonBase }]}>Rifiutato</Text>
          </View>
        );
      case 'absent':
        return (
          <View style={[styles.badge, styles.badgeAbsent]}>
            <AlertTriangle size={11} color={colors.parchmentMuted} />
            <Text style={[styles.badgeText, { color: colors.parchmentMuted }]}>Assente</Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Top Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={styles.headerMetaRow}>
                <Text style={styles.eyebrow}>GESTIONE ISCRITTI & TAVOLO</Text>
                <View
                  style={[
                    styles.sessionStatusChip,
                    session.status === 'completed'
                      ? styles.chipCompleted
                      : session.status === 'cancelled'
                      ? styles.chipCancelled
                      : styles.chipScheduled,
                  ]}
                >
                  <Text style={styles.sessionStatusChipText}>
                    {session.status === 'completed'
                      ? 'CONCLUSA'
                      : session.status === 'cancelled'
                      ? 'ANNULLATA'
                      : 'PROGRAMMATA'}
                  </Text>
                </View>
              </View>

              <Text style={styles.sessionTitle} numberOfLines={2}>
                {session.title || 'Sessione Senza Titolo'}
              </Text>

              {/* Date & Location */}
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Calendar size={12} color={colors.brassLight} />
                  <Text style={styles.metaText}>{formatDateTime(session.scheduled_at)}</Text>
                </View>
                {session.location ? (
                  <View style={styles.metaItem}>
                    <MapPin size={12} color={colors.parchmentMuted} />
                    <Text style={styles.metaText} numberOfLines={1}>
                      {session.location}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={20} color={colors.parchmentMuted} />
            </TouchableOpacity>
          </View>

          {/* Capacity Progress Bar */}
          <View style={styles.capacityCard}>
            <View style={styles.capacityHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Users size={15} color={isFull ? '#F59E0B' : colors.emerald} />
                <Text style={styles.capacityLabel}>
                  Capienza Tavolo: <Text style={styles.capacityBold}>{approvedSignups.length} / {maxPlayers}</Text> Giocatori
                </Text>
              </View>
              {isFull ? (
                <View style={styles.fullBadge}>
                  <Text style={styles.fullBadgeText}>TAVOLO AL COMPLETO</Text>
                </View>
              ) : (
                <Text style={styles.slotsLeftText}>
                  {maxPlayers - approvedSignups.length} posti liberi
                </Text>
              )}
            </View>

            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${capacityPercent}%`,
                    backgroundColor: isFull ? '#F59E0B' : colors.emerald,
                  },
                ]}
              />
            </View>
          </View>

          {/* Tabs Filter Row */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[styles.tabBtn, filterTab === 'all' && styles.tabBtnActive]}
              onPress={() => setFilterTab('all')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabBtnText, filterTab === 'all' && styles.tabBtnTextActive]}>
                Tutti ({signups.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, filterTab === 'approved' && styles.tabBtnActive]}
              onPress={() => setFilterTab('approved')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabBtnText, filterTab === 'approved' && styles.tabBtnTextActive]}>
                Confermati ({approvedSignups.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, filterTab === 'pending' && styles.tabBtnActive]}
              onPress={() => setFilterTab('pending')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabBtnText, filterTab === 'pending' && styles.tabBtnTextActive]}>
                In Attesa ({pendingSignups.length})
              </Text>
            </TouchableOpacity>

            {otherSignups.length > 0 && (
              <TouchableOpacity
                style={[styles.tabBtn, filterTab === 'other' && styles.tabBtnActive]}
                onPress={() => setFilterTab('other')}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabBtnText, filterTab === 'other' && styles.tabBtnTextActive]}>
                  Altri ({otherSignups.length})
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Signups List */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator size="small" color={colors.brassBase} />
                <Text style={styles.loadingText}>Verifica convocazioni al tavolo...</Text>
              </View>
            ) : filteredList.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Users size={32} color={colors.stoneBorder} />
                <Text style={styles.emptyTitle}>Nessun Iscritto in Questa Categoria</Text>
                <Text style={styles.emptySub}>
                  {signups.length === 0
                    ? 'Nessun giocatore si è ancora iscritto a questa sessione. Puoi aggiungere eroi manualmente qui sotto!'
                    : 'Nessun iscritto corrisponde al filtro selezionato.'}
                </Text>
              </View>
            ) : (
              filteredList.map((signup) => {
                const char = signup.character;
                const profile = signup.playerProfile;
                const isItemProcessing = processingId === signup.id;

                const displayName = profile?.display_name || profile?.nickname || 'Avventuriero Anonimo';
                const charName = char?.name;
                const charClass = char?.character_class;
                const charLevel = char?.level || 1;

                return (
                  <View key={signup.id} style={styles.signupCard}>
                    {/* Top Row: Avatar + Info + Status */}
                    <View style={styles.cardTopRow}>
                      {/* Avatar */}
                      {char?.image_url || profile?.avatar_url ? (
                        <Image
                          source={{ uri: char?.image_url || profile?.avatar_url! }}
                          style={styles.avatarImg}
                        />
                      ) : (
                        <View style={styles.avatarPlaceholder}>
                          <Shield size={18} color={colors.brassLight} />
                        </View>
                      )}

                      {/* Character & Player Text */}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.charNameText} numberOfLines={1}>
                          {charName || displayName}
                        </Text>
                        <Text style={styles.charMetaText} numberOfLines={1}>
                          {charClass ? `${charClass} (Liv. ${charLevel}) • ` : ''}
                          {charName ? displayName : 'Giocatore'}
                        </Text>
                      </View>

                      {/* Status Badge */}
                      {renderStatusBadge(signup.status)}
                    </View>

                    {/* Vitals preview if available */}
                    {char && (char.armor_class || char.hit_points) ? (
                      <View style={styles.vitalsStrip}>
                        {char.hit_points != null && (
                          <View style={styles.vitalMiniItem}>
                            <Heart size={11} color={colors.crimsonBase} />
                            <Text style={styles.vitalMiniText}>{char.hit_points} PF</Text>
                          </View>
                        )}
                        {char.armor_class != null && (
                          <View style={styles.vitalMiniItem}>
                            <Shield size={11} color={colors.brassBase} />
                            <Text style={styles.vitalMiniText}>CA {char.armor_class}</Text>
                          </View>
                        )}
                      </View>
                    ) : null}

                    {/* Action Buttons Row */}
                    <View style={styles.actionButtonsRow}>
                      {isItemProcessing ? (
                        <ActivityIndicator size="small" color={colors.brassBase} />
                      ) : (
                        <>
                          {/* If pending or waitlist: Approve or Reject */}
                          {(signup.status === 'pending' || signup.status === 'waitlist') && (
                            <>
                              <TouchableOpacity
                                style={[styles.actionBtn, styles.btnApprove]}
                                onPress={() => handleStatusChange(signup.id, 'approved')}
                                activeOpacity={0.8}
                              >
                                <Check size={13} color={colors.void} />
                                <Text style={styles.btnApproveText}>Approva</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={[styles.actionBtn, styles.btnReject]}
                                onPress={() => handleStatusChange(signup.id, 'rejected')}
                                activeOpacity={0.8}
                              >
                                <X size={13} color={colors.crimsonBase} />
                                <Text style={styles.btnRejectText}>Rifiuta</Text>
                              </TouchableOpacity>
                            </>
                          )}

                          {/* If approved/confirmed: Waitlist or Reject */}
                          {(signup.status === 'approved' || signup.status === 'confirmed') && (
                            <>
                              <TouchableOpacity
                                style={[styles.actionBtn, styles.btnWaitlist]}
                                onPress={() => handleStatusChange(signup.id, 'pending')}
                                activeOpacity={0.8}
                              >
                                <Clock size={13} color="#F59E0B" />
                                <Text style={styles.btnWaitlistText}>Metti in Attesa</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={[styles.actionBtn, styles.btnReject]}
                                onPress={() => handleStatusChange(signup.id, 'rejected')}
                                activeOpacity={0.8}
                              >
                                <X size={13} color={colors.crimsonBase} />
                                <Text style={styles.btnRejectText}>Rifiuta</Text>
                              </TouchableOpacity>
                            </>
                          )}

                          {/* If rejected or cancelled: Re-approve */}
                          {(signup.status === 'rejected' ||
                            signup.status === 'cancelled' ||
                            signup.status === 'absent') && (
                            <TouchableOpacity
                              style={[styles.actionBtn, styles.btnApprove]}
                              onPress={() => handleStatusChange(signup.id, 'approved')}
                              activeOpacity={0.8}
                            >
                              <RotateCcw size={13} color={colors.void} />
                              <Text style={styles.btnApproveText}>Ripristina & Approva</Text>
                            </TouchableOpacity>
                          )}

                          {/* Remove button always available */}
                          <TouchableOpacity
                            style={styles.removeBtn}
                            onPress={() => handleRemoveSignup(signup)}
                            activeOpacity={0.7}
                          >
                            <Trash2 size={13} color={colors.parchmentMuted} />
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>
                );
              })
            )}

            {/* Quick Add Player Trigger */}
            <TouchableOpacity
              style={styles.addPlayerCardTrigger}
              onPress={() => setAddPlayerModalVisible(true)}
              activeOpacity={0.8}
            >
              <UserPlus size={18} color={colors.brassLight} />
              <View style={{ flex: 1 }}>
                <Text style={styles.addPlayerTriggerTitle}>Aggiungi Giocatore / Eroe Manualmente</Text>
                <Text style={styles.addPlayerTriggerSub}>
                  {candidates.length > 0
                    ? `${candidates.length} membri della campagna disponibili per convocazione immediata`
                    : 'Aggiungi direttamente un membro della campagna al tavolo'}
                </Text>
              </View>
              <ChevronRight size={16} color={colors.brassBase} />
            </TouchableOpacity>

            {/* Session Management Options */}
            <View style={styles.sessionManagementSection}>
              <Text style={styles.sectionHeaderTitle}>OPZIONI REGIA SESSIONE</Text>
              <View style={styles.sessionOptionsRow}>
                {session.status === 'scheduled' ? (
                  <>
                    <TouchableOpacity
                      style={[styles.sessionStatusBtn, { borderColor: colors.emerald }]}
                      onPress={() => handleToggleSessionStatus('completed')}
                      activeOpacity={0.75}
                    >
                      <CheckCircle2 size={13} color={colors.emerald} />
                      <Text style={[styles.sessionStatusBtnText, { color: colors.emerald }]}>
                        Segna Completata
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.sessionStatusBtn, { borderColor: '#F59E0B' }]}
                      onPress={() => handleToggleSessionStatus('cancelled')}
                      activeOpacity={0.75}
                    >
                      <AlertTriangle size={13} color="#F59E0B" />
                      <Text style={[styles.sessionStatusBtnText, { color: '#F59E0B' }]}>
                        Annulla Tavolo
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={[styles.sessionStatusBtn, { borderColor: colors.brassBase }]}
                    onPress={() => handleToggleSessionStatus('scheduled')}
                    activeOpacity={0.75}
                  >
                    <RotateCcw size={13} color={colors.brassLight} />
                    <Text style={[styles.sessionStatusBtnText, { color: colors.brassLight }]}>
                      Riapri Sessione
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.sessionStatusBtn, { borderColor: colors.crimsonBase }]}
                  onPress={handleDeleteSession}
                  activeOpacity={0.75}
                >
                  <Trash2 size={13} color={colors.crimsonBase} />
                  <Text style={[styles.sessionStatusBtnText, { color: colors.crimsonBase }]}>
                    Elimina Sessione
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.footerCloseBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.footerCloseText}>Chiudi Gestione</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Modal: Add Candidate to Session */}
        <Modal
          visible={addPlayerModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setAddPlayerModalVisible(false)}
        >
          <View style={styles.subModalBackdrop}>
            <View style={styles.subModalCard}>
              <View style={styles.subModalHeader}>
                <Text style={styles.subModalTitle}>CONVOCA EROE AL TAVOLO</Text>
                <TouchableOpacity onPress={() => setAddPlayerModalVisible(false)}>
                  <X size={18} color={colors.parchmentMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 340 }}>
                {candidates.length === 0 ? (
                  <View style={{ padding: 24, alignItems: 'center' }}>
                    <Text style={{ color: colors.parchmentMuted, fontSize: 13, textAlign: 'center' }}>
                      Tutti gli eroi della campagna risultano già convocati o iscritti a questa sessione!
                    </Text>
                  </View>
                ) : (
                  candidates.map((cand) => (
                    <TouchableOpacity
                      key={cand.playerId}
                      style={styles.candidateRow}
                      onPress={() => handleAddCandidate(cand)}
                      activeOpacity={0.75}
                    >
                      {cand.avatarUrl ? (
                        <Image source={{ uri: cand.avatarUrl }} style={styles.candAvatar} />
                      ) : (
                        <View style={styles.candAvatarPlaceholder}>
                          <Shield size={16} color={colors.brassLight} />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.candName}>{cand.characterName || cand.name}</Text>
                        <Text style={styles.candMeta}>
                          {cand.characterClass ? `${cand.characterClass} (Liv. ${cand.characterLevel ?? 1}) • ` : ''}
                          Membro Campagna
                        </Text>
                      </View>
                      <View style={styles.candAddBadge}>
                        <Plus size={12} color={colors.void} />
                        <Text style={styles.candAddText}>Aggiungi</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxHeight: '92%',
    backgroundColor: colors.stoneSurface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.brassDark,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.stone,
    borderBottomWidth: 1,
    borderBottomColor: colors.stoneBorder,
  },
  headerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  eyebrow: {
    fontSize: 9.5,
    fontWeight: '800',
    color: colors.brassLight,
    letterSpacing: 0.8,
  },
  sessionStatusChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  chipScheduled: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: colors.emerald,
  },
  chipCompleted: {
    backgroundColor: 'rgba(226, 201, 146, 0.15)',
    borderColor: colors.brassLight,
  },
  chipCancelled: {
    backgroundColor: 'rgba(168, 32, 32, 0.15)',
    borderColor: colors.crimsonBase,
  },
  sessionStatusChipText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.parchmentLight,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: colors.parchmentMuted,
  },
  closeBtn: {
    padding: 6,
  },
  capacityCard: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.stone,
    borderBottomWidth: 1,
    borderBottomColor: colors.stoneBorder,
  },
  capacityHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  capacityLabel: {
    fontSize: 12,
    color: colors.parchmentMuted,
  },
  capacityBold: {
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  fullBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  fullBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#F59E0B',
  },
  slotsLeftText: {
    fontSize: 11,
    color: colors.emerald,
    fontWeight: '600',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.stoneSurface,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: colors.stone,
    borderBottomWidth: 1,
    borderBottomColor: colors.stoneBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  tabBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
  },
  tabBtnActive: {
    backgroundColor: colors.brassBase,
    borderColor: colors.brassLight,
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.parchmentMuted,
  },
  tabBtnTextActive: {
    color: colors.void,
    fontWeight: '800',
  },
  scrollArea: {
    flexGrow: 0,
  },
  scrollContent: {
    padding: 14,
    gap: 12,
  },
  centerLoading: {
    paddingVertical: 36,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: colors.parchmentMuted,
  },
  emptyWrap: {
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.parchmentLight,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12,
    color: colors.parchmentMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  signupCard: {
    backgroundColor: colors.stone,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 12,
    gap: 10,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarImg: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.brassDark,
  },
  avatarPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  charNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  charMetaText: {
    fontSize: 11,
    color: colors.parchmentMuted,
    marginTop: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  badgeApproved: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: colors.emerald,
  },
  badgeAttended: {
    backgroundColor: 'rgba(226, 201, 146, 0.15)',
    borderColor: colors.brassLight,
  },
  badgePending: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#F59E0B',
  },
  badgeRejected: {
    backgroundColor: 'rgba(168, 32, 32, 0.15)',
    borderColor: colors.crimsonBase,
  },
  badgeAbsent: {
    backgroundColor: 'rgba(158, 151, 142, 0.15)',
    borderColor: colors.stoneBorder,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  vitalsStrip: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.stoneSurface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  vitalMiniItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  vitalMiniText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.parchmentLight,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.stoneBorder,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    borderRadius: 6,
  },
  btnApprove: {
    backgroundColor: colors.emerald,
  },
  btnApproveText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.void,
  },
  btnReject: {
    backgroundColor: 'rgba(168, 32, 32, 0.15)',
    borderWidth: 1,
    borderColor: colors.crimsonBase,
  },
  btnRejectText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.crimsonBase,
  },
  btnWaitlist: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  btnWaitlistText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B',
  },
  removeBtn: {
    padding: 7,
    borderRadius: 6,
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
  },
  addPlayerCardTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.stone,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.brassDark,
    borderRadius: 10,
    padding: 14,
  },
  addPlayerTriggerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.brassLight,
  },
  addPlayerTriggerSub: {
    fontSize: 11,
    color: colors.parchmentMuted,
    marginTop: 2,
  },
  sessionManagementSection: {
    marginTop: 8,
    gap: 8,
  },
  sectionHeaderTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.parchmentMuted,
    letterSpacing: 0.6,
  },
  sessionOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sessionStatusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: colors.stone,
  },
  sessionStatusBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.stone,
    borderTopWidth: 1,
    borderTopColor: colors.stoneBorder,
  },
  footerCloseBtn: {
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
  },
  footerCloseText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.parchmentLight,
  },
  subModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  subModalCard: {
    width: '100%',
    backgroundColor: colors.stoneSurface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.brassDark,
    overflow: 'hidden',
  },
  subModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.stone,
    borderBottomWidth: 1,
    borderBottomColor: colors.stoneBorder,
  },
  subModalTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.brassLight,
  },
  candidateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.stoneBorder,
  },
  candAvatar: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  candAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: colors.stone,
    alignItems: 'center',
    justifyContent: 'center',
  },
  candName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.parchmentLight,
  },
  candMeta: {
    fontSize: 10.5,
    color: colors.parchmentMuted,
  },
  candAddBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.brassBase,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
  },
  candAddText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.void,
  },
});
