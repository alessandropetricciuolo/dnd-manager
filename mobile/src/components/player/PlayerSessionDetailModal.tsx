import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  User,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Shield,
  Hourglass,
  RotateCcw,
  Star,
  BookOpen,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { CAMPAIGN_TYPE_BADGES, useCampaign } from '../../contexts/CampaignContext';
import { CampaignType, PlayerSession, SessionFeedbackEntry } from '../../types';
import { normalizeSessionPartyBadge } from '../../lib/session-booking';
import { RichMarkdownView } from '../common/RichMarkdownView';

interface PlayerSessionDetailModalProps {
  visible: boolean;
  session: PlayerSession | null;
  existingFeedback?: SessionFeedbackEntry | null;
  onClose: () => void;
  onSignUp: (session: PlayerSession) => Promise<void>;
  onCancelSignUp: (session: PlayerSession) => void;
  onOpenFeedback?: (session: PlayerSession) => void;
}

export const PlayerSessionDetailModal: React.FC<PlayerSessionDetailModalProps> = ({
  visible,
  session,
  existingFeedback,
  onClose,
  onSignUp,
  onCancelSignUp,
  onOpenFeedback,
}) => {
  const { gmNamesByCampaignId, sessionDirectoryMeta } = useCampaign();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!session) return null;

  const campName = session.campaigns?.name || 'Campagna di Gilda';
  const campType: CampaignType = (session.campaigns?.type as CampaignType) || 'quest';
  const badgeMeta = CAMPAIGN_TYPE_BADGES[campType] || CAMPAIGN_TYPE_BADGES.quest;
  const partyBadge = normalizeSessionPartyBadge(session.campaign_parties);
  const directoryEntry = sessionDirectoryMeta[session.id];
  const dmName =
    directoryEntry?.dmName ||
    (session.campaign_id ? gmNamesByCampaignId[session.campaign_id] : null) ||
    'Master di Gilda';
  const participantNames = directoryEntry?.participants ?? [];

  // Format date & time
  let dateFormatted = 'Data da definire';
  let timeFormatted = '--:--';
  try {
    const d = new Date(session.scheduled_at);
    if (!isNaN(d.getTime())) {
      dateFormatted = d.toLocaleDateString('it-IT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      dateFormatted = dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1);
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      timeFormatted = `${hours}:${mins}`;
    }
  } catch {}

  const durationStr = session.duration_hours
    ? `${session.duration_hours}h`
    : 'Circa 3h 30m';

  const maxPlayers = session.max_players ?? 6;
  const confirmedCount =
    session.confirmedCount ??
    (session.session_signups
      ? session.session_signups.filter(
          (s) => s.status === 'confirmed' || s.status === 'approved' || s.status === 'attended'
        ).length
      : 0);
  const isCompleted = session.status === 'completed';
  const isAttended = session.mySignup?.status === 'attended';
  const isFull = confirmedCount >= maxPlayers;
  const isRegistered = !!session.isConfirmed;
  const isWaitlist = !!session.isWaitlist;

  const handlePressAction = async () => {
    if (isRegistered || isWaitlist) {
      onCancelSignUp(session);
      onClose();
      return;
    }

    try {
      setIsSubmitting(true);
      await onSignUp(session);
      onClose();
    } catch {
      Alert.alert('Errore', 'Impossibile completare la prenotazione. Riprova.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheetContainer}>
          {/* Header Bar */}
          <View style={styles.header}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <View style={styles.badgesWrap}>
                <View
                  style={[
                    styles.badgePill,
                    { backgroundColor: badgeMeta.bg, borderColor: badgeMeta.border },
                  ]}
                >
                  <Text style={[styles.badgeText, { color: badgeMeta.text }]}>
                    {badgeMeta.label}
                  </Text>
                </View>

                {partyBadge && (
                  <View
                    style={[
                      styles.badgePill,
                      {
                        backgroundColor: 'rgba(255,255,255,0.06)',
                        borderColor: partyBadge.color,
                      },
                    ]}
                  >
                    <Text style={[styles.badgeText, { color: partyBadge.color }]}>
                      GRUPPO: {partyBadge.name.toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.campaignTitle}>{campName}</Text>
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color={colors.parchmentLight} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            {/* Optional Chapter Kicker */}
            {session.chapter_title ? (
              <View style={styles.chapterRow}>
                <BookOpen size={13} color={colors.brassBase} />
                <Text style={styles.chapterText}>{session.chapter_title}</Text>
              </View>
            ) : null}

            {/* Session Title */}
            <Text style={styles.sessionTitle}>
              {session.title || 'Sessione Ufficiale al Tavolo'}
            </Text>

            {/* Status Banner */}
            {isCompleted ? (
              <View style={styles.statusBannerConfirmed}>
                <CheckCircle2 size={18} color={colors.emerald} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.statusBannerTitleConfirmed}>
                    {isAttended ? 'SESSIONE CONCLUSA · PRESENZA REGISTRATA' : 'SESSIONE CONCLUSA'}
                  </Text>
                  <Text style={styles.statusBannerSub}>
                    {isAttended
                      ? 'Hai partecipato a questa giocata al tavolo della Gilda.'
                      : 'Archivio storico della campagna.'}
                  </Text>
                </View>
              </View>
            ) : isRegistered ? (
              <View style={styles.statusBannerConfirmed}>
                <CheckCircle2 size={18} color={colors.emerald} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.statusBannerTitleConfirmed}>SEI ISCRITTO A QUESTO TAVOLO</Text>
                  <Text style={styles.statusBannerSub}>
                    Il tuo posto è confermato. Presentati in taverna all&apos;orario indicato.
                  </Text>
                </View>
              </View>
            ) : isWaitlist ? (
              <View style={styles.statusBannerWaitlist}>
                <Hourglass size={18} color={colors.brassLight} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.statusBannerTitleWaitlist}>SEI IN LISTA D&apos;ATTESA</Text>
                  <Text style={styles.statusBannerSub}>
                    Verrai promosso a confermato qualora un giocatore dovesse rinunciare.
                  </Text>
                </View>
              </View>
            ) : isFull ? (
              <View style={styles.statusBannerFull}>
                <AlertCircle size={18} color={colors.crimsonLight} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.statusBannerTitleFull}>
                    TAVOLO AL COMPLETO ({confirmedCount}/{maxPlayers})
                  </Text>
                  <Text style={styles.statusBannerSub}>
                    Puoi comunque prenotarti in lista d&apos;attesa prioritaria.
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.statusBannerOpen}>
                <Sparkles size={18} color={colors.brassBase} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.statusBannerTitleOpen}>ISCRIZIONI APERTE</Text>
                  <Text style={styles.statusBannerSub}>
                    {maxPlayers - confirmedCount} posti ancora disponibili su {maxPlayers}.
                  </Text>
                </View>
              </View>
            )}

            {/* Info Grid */}
            <View style={styles.infoBox}>
              <View style={styles.infoRow}>
                <User size={18} color={colors.brassLight} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>GAME MASTER / DM</Text>
                  <Text style={styles.infoValue}>{dmName}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Calendar size={18} color={colors.brassLight} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>DATA</Text>
                  <Text style={styles.infoValue}>{dateFormatted}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Clock size={18} color={colors.brassLight} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>ORARIO E DURATA</Text>
                  <Text style={styles.infoValue}>
                    Ore {timeFormatted} · Durata {durationStr}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <MapPin size={18} color={colors.brassLight} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>LUOGO DI RITROVO</Text>
                  <Text style={styles.infoValue}>
                    {session.location || 'Barber & Dragons · Tavolo Taverna'}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Users size={18} color={colors.brassLight} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>AVVENTURIERI AL TAVOLO</Text>
                  <Text style={styles.infoValue}>
                    {confirmedCount} di {maxPlayers} eroi registrati
                  </Text>
                  {participantNames.length > 0 && (
                    <View style={styles.participantsWrap}>
                      {participantNames.map((pName, idx) => (
                        <View key={`${pName}-${idx}`} style={styles.participantChip}>
                          <Text style={styles.participantChipText}>{pName}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Quest Notes */}
            {(session.notes || session.description) ? (
              <View style={styles.descriptionSection}>
                <Text style={styles.sectionSubtitle}>NOTE DELLA MISSIONE</Text>
                <RichMarkdownView markdown={session.notes || session.description || ''} />
              </View>
            ) : null}

            {/* Session Summary (Completed / Recap) */}
            {session.session_summary ? (
              <View style={styles.summarySection}>
                <Text style={styles.sectionSubtitle}>RIASSUNTO DELLA CRONACA</Text>
                <RichMarkdownView markdown={session.session_summary} />
              </View>
            ) : null}

            {/* Action CTA */}
            <View style={styles.actionContainer}>
              {isCompleted ? (
                isAttended && onOpenFeedback ? (
                  <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={() => {
                      onClose();
                      onOpenFeedback(session);
                    }}
                    activeOpacity={0.85}
                  >
                    <Star size={18} color={colors.void} />
                    <Text style={styles.primaryBtnText}>
                      {existingFeedback
                        ? `Modifica Feedback (★ ${existingFeedback.session_rating}/5)`
                        : 'Valuta Sessione (Feedback)'}
                    </Text>
                  </TouchableOpacity>
                ) : null
              ) : isRegistered || isWaitlist ? (
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={handlePressAction}
                  disabled={isSubmitting}
                  activeOpacity={0.8}
                >
                  <RotateCcw size={16} color={colors.crimsonLight} />
                  <Text style={styles.cancelBtnText}>Annulla la mia Iscrizione</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.primaryBtn, isFull && styles.waitlistBtn]}
                  onPress={handlePressAction}
                  disabled={isSubmitting}
                  activeOpacity={0.85}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color={colors.void} />
                  ) : (
                    <>
                      <Shield size={18} color={isFull ? colors.parchmentLight : colors.void} />
                      <Text
                        style={[
                          styles.primaryBtnText,
                          isFull && styles.waitlistBtnText,
                        ]}
                      >
                        {isFull
                          ? "Prenota in Lista d'Attesa"
                          : 'Iscriviti a questa Sessione'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: colors.stone,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(200, 157, 73, 0.3)',
    maxHeight: '88%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  badgesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  badgePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  campaignTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.parchmentLight,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  chapterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  chapterText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brassBase,
  },
  sessionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.brassLight,
    marginBottom: 14,
  },
  statusBannerConfirmed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  statusBannerTitleConfirmed: {
    color: colors.emerald,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusBannerWaitlist: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(217, 119, 6, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.4)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  statusBannerTitleWaitlist: {
    color: colors.brassLight,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusBannerFull: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  statusBannerTitleFull: {
    color: colors.crimsonLight,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusBannerOpen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.35)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  statusBannerTitleOpen: {
    color: colors.brassBase,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusBannerSub: {
    color: colors.parchmentMuted,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  infoBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.15)',
    padding: 14,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 4,
  },
  infoLabel: {
    color: colors.parchmentMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  infoValue: {
    color: colors.parchmentLight,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  participantsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  participantChip: {
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  participantChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brassLight,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 10,
  },
  descriptionSection: {
    marginBottom: 16,
  },
  summarySection: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    padding: 12,
    marginBottom: 18,
  },
  sectionSubtitle: {
    color: colors.brassBase,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
    marginBottom: 6,
  },
  actionContainer: {
    marginTop: 6,
  },
  primaryBtn: {
    backgroundColor: colors.brassBase,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    color: colors.void,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  waitlistBtn: {
    backgroundColor: 'rgba(217, 119, 6, 0.3)',
    borderWidth: 1,
    borderColor: '#d97706',
  },
  waitlistBtnText: {
    color: colors.parchmentLight,
  },
  cancelBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cancelBtnText: {
    color: colors.crimsonLight,
    fontSize: 14,
    fontWeight: '700',
  },
});
