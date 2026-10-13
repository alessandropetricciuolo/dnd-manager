import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  Plus,
  Play,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Crown,
  Swords,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useCampaign } from '../../contexts/CampaignContext';
import { useGmCampaigns } from '../../hooks/useGmCampaigns';
import { Session } from '../../types';
import { GmCreateSessionModal } from './GmCreateSessionModal';
import { GmSessionSignupsModal } from './GmSessionSignupsModal';

interface GmSessionsManagerModalProps {
  visible: boolean;
  onClose: () => void;
  campaignId?: string;
  campaignTitle?: string;
  onRequestCreateSession?: () => void;
  onLaunchCombat?: () => void;
}

export const GmSessionsManagerModal: React.FC<GmSessionsManagerModalProps> = ({
  visible,
  onClose,
  campaignId,
  campaignTitle,
  onRequestCreateSession,
  onLaunchCombat,
}) => {
  const { activeCampaign } = useCampaign();
  const { sessions, activeSession, selectSession, isLoading, refreshSessionData } = useGmCampaigns();

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedSessionForSignups, setSelectedSessionForSignups] = useState<Session | null>(null);

  const handleOpenCreate = () => {
    if (onRequestCreateSession) {
      onRequestCreateSession();
    } else {
      setCreateModalVisible(true);
    }
  };

  // Format Italian date
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

  const scheduledSessions = sessions.filter((s) => s.status === 'scheduled');
  const pastSessions = sessions.filter((s) => s.status === 'completed');
  const otherSessions = sessions.filter((s) => s.status === 'cancelled');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={styles.headerMetaRow}>
                <Crown size={12} color={colors.brassLight} />
                <Text style={styles.eyebrow}>CALENDARIO TAVOLI REGIA</Text>
              </View>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {campaignTitle || activeCampaign?.name || 'Tavoli di Gioco'}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                style={styles.newSessionBtn}
                onPress={handleOpenCreate}
                activeOpacity={0.8}
              >
                <Plus size={13} color={colors.void} />
                <Text style={styles.newSessionBtnText}>Nuova</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                <X size={20} color={colors.parchmentMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Sessions List */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {isLoading ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator size="small" color={colors.brassBase} />
                <Text style={styles.loadingText}>Caricamento sessioni...</Text>
              </View>
            ) : sessions.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Calendar size={36} color={colors.stoneBorder} />
                <Text style={styles.emptyTitle}>Nessuna Sessione Programmata</Text>
                <Text style={styles.emptySub}>
                  Questa campagna non ha ancora sessioni a calendario. Crea il primo capitolo per convocare gli eroi al tavolo!
                </Text>
                <TouchableOpacity
                  style={styles.emptyCreateBtn}
                  onPress={handleOpenCreate}
                  activeOpacity={0.85}
                >
                  <Plus size={15} color={colors.void} />
                  <Text style={styles.emptyCreateBtnText}>Crea Prima Sessione</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* 1. Scheduled / Upcoming */}
                {scheduledSessions.length > 0 && (
                  <View style={styles.sectionGroup}>
                    <Text style={styles.sectionHeaderTitle}>SESSIONI PROGRAMMATE ({scheduledSessions.length})</Text>
                    {scheduledSessions.map((s) => {
                      const isActive = s.id === activeSession?.id;
                      return (
                        <View
                          key={s.id}
                          style={[styles.sessionCard, isActive && styles.sessionCardActive]}
                        >
                          {/* Card Header */}
                          <View style={styles.cardHeaderRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.cardSessionTitle} numberOfLines={1}>
                                {s.title || 'Sessione da definire'}
                              </Text>
                              <View style={styles.cardMetaRow}>
                                <Calendar size={12} color={colors.brassLight} />
                                <Text style={styles.cardMetaText}>{formatDateTime(s.scheduled_at)}</Text>
                              </View>
                              {s.location ? (
                                <View style={styles.cardMetaRow}>
                                  <MapPin size={12} color={colors.parchmentMuted} />
                                  <Text style={styles.cardMetaText} numberOfLines={1}>
                                    {s.location}
                                  </Text>
                                </View>
                              ) : null}
                            </View>

                            {isActive && (
                              <View style={styles.activePill}>
                                <Text style={styles.activePillText}>IN REGIA</Text>
                              </View>
                            )}
                          </View>

                          {/* Capacity strip */}
                          <View style={styles.cardFooterRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Users size={13} color={colors.parchmentMuted} />
                              <Text style={styles.maxPlayersText}>Max {s.max_players || 6} posti</Text>
                            </View>

                            {/* Actions */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              {!isActive && (
                                <TouchableOpacity
                                  style={styles.setActiveBtn}
                                  onPress={() => selectSession(s.id)}
                                  activeOpacity={0.7}
                                >
                                  <Text style={styles.setActiveBtnText}>Seleziona</Text>
                                </TouchableOpacity>
                              )}

                              <TouchableOpacity
                                style={styles.signupsManageBtn}
                                onPress={() => setSelectedSessionForSignups(s)}
                                activeOpacity={0.8}
                              >
                                <Users size={12} color={colors.void} />
                                <Text style={styles.signupsManageBtnText}>Gestisci Iscritti</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* 2. Past Sessions */}
                {pastSessions.length > 0 && (
                  <View style={styles.sectionGroup}>
                    <Text style={styles.sectionHeaderTitle}>SESSIONI CONCLUSE ({pastSessions.length})</Text>
                    {pastSessions.map((s) => (
                      <View key={s.id} style={[styles.sessionCard, styles.sessionCardPast]}>
                        <View style={styles.cardHeaderRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.cardSessionTitle} numberOfLines={1}>
                              {s.title || 'Sessione Conclusa'}
                            </Text>
                            <Text style={styles.cardMetaText}>{formatDateTime(s.scheduled_at)}</Text>
                          </View>
                          <View style={styles.completedBadge}>
                            <CheckCircle2 size={11} color={colors.brassLight} />
                            <Text style={styles.completedBadgeText}>Compiuta</Text>
                          </View>
                        </View>

                        <View style={styles.cardFooterRow}>
                          <Text style={styles.maxPlayersText}>{s.location || 'Tavolo gilda'}</Text>
                          <TouchableOpacity
                            style={styles.pastSignupsBtn}
                            onPress={() => setSelectedSessionForSignups(s)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.pastSignupsText}>Vedi Registro</Text>
                            <ChevronRight size={12} color={colors.parchmentMuted} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* 3. Cancelled Sessions */}
                {otherSessions.length > 0 && (
                  <View style={styles.sectionGroup}>
                    <Text style={styles.sectionHeaderTitle}>SESSIONI ANNULLATE ({otherSessions.length})</Text>
                    {otherSessions.map((s) => (
                      <View key={s.id} style={[styles.sessionCard, styles.sessionCardPast]}>
                        <View style={styles.cardHeaderRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.cardSessionTitle, { textDecorationLine: 'line-through' }]} numberOfLines={1}>
                              {s.title || 'Sessione Annullata'}
                            </Text>
                            <Text style={styles.cardMetaText}>{formatDateTime(s.scheduled_at)}</Text>
                          </View>
                          <View style={styles.cancelledBadge}>
                            <Text style={styles.cancelledBadgeText}>Annullata</Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={styles.pastSignupsBtn}
                          onPress={() => setSelectedSessionForSignups(s)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.pastSignupsText}>Dettagli & Ripristino</Text>
                          <ChevronRight size={12} color={colors.parchmentMuted} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.footerCloseBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.footerCloseText}>Chiudi Calendario</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Create Session Modal */}
        <GmCreateSessionModal
          visible={createModalVisible}
          campaignId={campaignId || activeCampaign?.id}
          onClose={() => setCreateModalVisible(false)}
          onSessionCreated={() => {
            void refreshSessionData();
          }}
        />

        {/* Manage Signups Modal */}
        <GmSessionSignupsModal
          visible={selectedSessionForSignups !== null}
          session={selectedSessionForSignups}
          onClose={() => setSelectedSessionForSignups(null)}
          onSessionUpdated={() => {
            void refreshSessionData();
          }}
        />
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.stone,
    borderBottomWidth: 1,
    borderBottomColor: colors.stoneBorder,
  },
  headerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  eyebrow: {
    fontSize: 9.5,
    fontWeight: '800',
    color: colors.brassLight,
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  newSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.brassBase,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  newSessionBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.void,
  },
  closeBtn: {
    padding: 6,
  },
  scrollArea: {
    flexGrow: 0,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  centerLoading: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: colors.parchmentMuted,
  },
  emptyWrap: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontSize: 15,
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
  emptyCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.brassBase,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  emptyCreateBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.void,
  },
  sectionGroup: {
    gap: 10,
  },
  sectionHeaderTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.parchmentMuted,
    letterSpacing: 0.7,
  },
  sessionCard: {
    backgroundColor: colors.stone,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 12,
    gap: 10,
  },
  sessionCardActive: {
    borderColor: colors.brassBase,
    backgroundColor: colors.stoneSurface,
  },
  sessionCardPast: {
    opacity: 0.8,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardSessionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.parchmentLight,
    marginBottom: 4,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  cardMetaText: {
    fontSize: 11,
    color: colors.parchmentMuted,
  },
  activePill: {
    backgroundColor: colors.brassBase,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.void,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(226, 201, 146, 0.15)',
    borderWidth: 1,
    borderColor: colors.brassLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  completedBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: colors.brassLight,
  },
  cancelledBadge: {
    backgroundColor: 'rgba(168, 32, 32, 0.15)',
    borderWidth: 1,
    borderColor: colors.crimsonBase,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cancelledBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: colors.crimsonBase,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.stoneBorder,
  },
  maxPlayersText: {
    fontSize: 11,
    color: colors.parchmentMuted,
  },
  setActiveBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
  },
  setActiveBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.parchmentLight,
  },
  signupsManageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.brassBase,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  signupsManageBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.void,
  },
  pastSignupsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pastSignupsText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.parchmentMuted,
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
});
