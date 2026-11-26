import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Star, X, Send } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { PlayerSession, SessionFeedbackEntry } from '../../types';

interface SessionFeedbackModalProps {
  visible: boolean;
  session: PlayerSession | null;
  existingFeedback?: SessionFeedbackEntry | null;
  onClose: () => void;
  onSubmit: (
    sessionId: string,
    campaignId: string,
    payload: { sessionRating: number; campaignRating: number; comment?: string | null }
  ) => Promise<{ success: boolean; error?: string }>;
}

const RATING_LABELS: Record<number, string> = {
  1: '1 · Da rivedere',
  2: '2 · Sottotono',
  3: '3 · Buona',
  4: '4 · Ottima',
  5: '5 · Epica!',
};

export const SessionFeedbackModal: React.FC<SessionFeedbackModalProps> = ({
  visible,
  session,
  existingFeedback,
  onClose,
  onSubmit,
}) => {
  const [sessionRating, setSessionRating] = useState<number>(5);
  const [campaignRating, setCampaignRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!visible || !session) return;
    setSessionRating(existingFeedback?.session_rating ?? 5);
    setCampaignRating(existingFeedback?.campaign_rating ?? 5);
    setComment(existingFeedback?.comment ?? '');
  }, [visible, session, existingFeedback]);

  if (!session) return null;

  const campaignName = session.campaigns?.name || 'Campagna Barber & Dragons';

  const handleSave = async () => {
    if (!session.campaign_id) {
      Alert.alert('Errore', 'Campagna non associata a questa sessione.');
      return;
    }
    setSubmitting(true);
    const res = await onSubmit(session.id, session.campaign_id, {
      sessionRating,
      campaignRating,
      comment,
    });
    setSubmitting(false);

    if (res.success) {
      Alert.alert('Grazie!', 'Il tuo feedback sulla sessione è stato registrato.');
      onClose();
    } else {
      Alert.alert('Attenzione', res.error || 'Impossibile salvare il feedback.');
    }
  };

  const renderStars = (value: number, onChange: (val: number) => void) => (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= value;
        return (
          <TouchableOpacity
            key={star}
            style={[styles.starBtn, active && styles.starBtnActive]}
            onPress={() => onChange(star)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`${star} stelle`}
          >
            <Star
              size={24}
              color={active ? colors.brassLight : colors.parchmentMuted}
              fill={active ? colors.brassBase : 'transparent'}
            />
          </TouchableOpacity>
        );
      })}
      <Text style={styles.ratingHint}>{RATING_LABELS[value] ?? ''}</Text>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.kicker}>FEEDBACK POST-SESSIONE</Text>
              <Text style={styles.title} numberOfLines={2}>
                {session.title || 'Sessione Conchiusa'}
              </Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {campaignName}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color={colors.parchmentLight} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.introText}>
              Com’è andata la serata al tavolo? La tua valutazione aiuta il Master e la Gilda a calibrare ritmo, sfide e narrazione.
            </Text>

            <View style={styles.ratingCard}>
              <Text style={styles.fieldLabel}>VALUTAZIONE SESSIONE</Text>
              {renderStars(sessionRating, setSessionRating)}
            </View>

            <View style={styles.ratingCard}>
              <Text style={styles.fieldLabel}>VALUTAZIONE CAMPAGNA</Text>
              {renderStars(campaignRating, setCampaignRating)}
            </View>

            <View style={styles.commentBox}>
              <Text style={styles.fieldLabel}>NOTE O MOMENTI PREFERITI (OPZIONALE)</Text>
              <TextInput
                style={styles.textArea}
                value={comment}
                onChangeText={setComment}
                placeholder="Scene memorabili, PNG preferiti o suggerimenti per le prossime giocate..."
                placeholderTextColor={colors.parchmentMuted}
                multiline
                maxLength={1000}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.void} />
              ) : (
                <>
                  <Send size={16} color={colors.void} />
                  <Text style={styles.submitBtnText}>
                    {existingFeedback ? 'Aggiorna Feedback' : 'Invia Feedback'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.stone,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(200, 157, 73, 0.35)',
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
  kicker: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.brassBase,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  subtitle: {
    fontSize: 12,
    color: colors.parchmentMuted,
    marginTop: 2,
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
  introText: {
    fontSize: 13,
    color: colors.parchmentMuted,
    lineHeight: 18,
    marginBottom: 16,
  },
  ratingCard: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 14,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.brassLight,
    letterSpacing: 0.7,
    marginBottom: 10,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  starBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
  },
  starBtnActive: {
    borderColor: 'rgba(212, 175, 55, 0.5)',
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
  },
  ratingHint: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.parchmentLight,
    marginLeft: 4,
  },
  commentBox: {
    marginTop: 4,
    marginBottom: 18,
  },
  textArea: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 12,
    minHeight: 96,
    color: colors.parchmentLight,
    fontSize: 13,
    lineHeight: 18,
  },
  submitBtn: {
    backgroundColor: colors.brassBase,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitBtnText: {
    color: colors.void,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});
