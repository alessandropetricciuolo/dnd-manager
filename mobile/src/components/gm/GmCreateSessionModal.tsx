import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  Lock,
  Sparkles,
  Check,
  Plus,
  Minus,
  Swords,
  Crown,
  BookOpen,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useCampaign } from '../../contexts/CampaignContext';
import { useGmCampaigns } from '../../hooks/useGmCampaigns';
import { CampaignSelectorModal } from '../common/CampaignSelectorModal';

interface GmCreateSessionModalProps {
  visible: boolean;
  onClose: () => void;
  campaignId?: string;
  onSessionCreated?: (sessionId: string) => void;
}

const LOCATION_PRESETS = [
  'Tavolo 1 - Taverna',
  'Tavolo 2 - Forgia',
  'Saletta Privata del Drago',
  'Tavolo Est',
  'Online Discord',
];

const TIME_PRESETS = ['15:00', '18:00', '20:30', '21:00', '21:30'];

const TITLE_SUGGESTIONS = [
  'Capitolo 1: La Notte dei Presagi',
  'Capitolo 2: Il Labirinto di Pietra',
  'Capitolo 3: L’Abominio Sommerso',
  'Capitolo 4: Il Sigillo Spezzato',
  'Sessione Straordinaria: Assalto Notturno',
  'Infiltrazione nei Sotterranei',
  'Boss Fight: Il Risveglio dell’Antico',
];

export const GmCreateSessionModal: React.FC<GmCreateSessionModalProps> = ({
  visible,
  onClose,
  campaignId: propCampaignId,
  onSessionCreated,
}) => {
  const { activeCampaign, activeCampaignId } = useCampaign();
  const { createSession } = useGmCampaigns();

  // Form states
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('21:00');
  const [location, setLocation] = useState(LOCATION_PRESETS[0]);
  const [maxPlayers, setMaxPlayers] = useState(5);
  const [notes, setNotes] = useState('');
  const [gmPrivateNotes, setGmPrivateNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [campaignModalVisible, setCampaignModalVisible] = useState(false);

  // Helper date format YYYY-MM-DD
  const getFormattedDate = (daysFromNow: number = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Helper to find next target day of week (0 = Sunday, 5 = Friday, 6 = Saturday)
  const getNextDayOfWeek = (dayOfWeek: number) => {
    const d = new Date();
    const currentDay = d.getDay();
    let distance = (dayOfWeek - currentDay + 7) % 7;
    if (distance === 0) distance = 7;
    d.setDate(d.getDate() + distance);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Initialize with tomorrow date when modal opens
  useEffect(() => {
    if (visible) {
      if (!date) {
        setDate(getFormattedDate(1));
      }
    }
  }, [visible]);

  const resetForm = () => {
    setTitle('');
    setDate(getFormattedDate(1));
    setTime('21:00');
    setLocation(LOCATION_PRESETS[0]);
    setMaxPlayers(5);
    setNotes('');
    setGmPrivateNotes('');
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Titolo Obbligatorio', 'Inserisci un titolo o nome capitolo per la sessione.');
      return;
    }

    if (!date.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      Alert.alert('Data non valida', 'Inserisci la data nel formato AAAA-MM-GG (es. 2026-10-15).');
      return;
    }

    if (!time.trim() || !/^\d{1,2}:\d{2}$/.test(time.trim())) {
      Alert.alert('Orario non valido', 'Inserisci l’orario nel formato HH:MM (es. 21:00).');
      return;
    }

    const campaignId = propCampaignId || activeCampaignId || 'demo-campaign-quest';

    try {
      setIsSubmitting(true);

      // Construct scheduled_at ISO timestamp
      const scheduledIso = new Date(`${date.trim()}T${time.trim().padStart(5, '0')}:00`).toISOString();

      const result = await createSession({
        campaign_id: campaignId,
        title: title.trim(),
        scheduled_at: scheduledIso,
        max_players: maxPlayers,
        location: location.trim() || null,
        notes: notes.trim() || null,
        gm_private_notes: gmPrivateNotes.trim() || null,
      });

      if (result.success && result.session) {
        Alert.alert(
          'Tavolo Convocato!',
          `La sessione "${title.trim()}" è stata creata con successo e inserita nel calendario del party.`
        );
        resetForm();
        onClose();
        if (onSessionCreated) {
          onSessionCreated(result.session.id);
        }
      } else {
        Alert.alert('Errore di Creazione', result.error || 'Impossibile creare la sessione.');
      }
    } catch (e: any) {
      Alert.alert('Errore imprevisto', e?.message || 'Riprova più tardi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIconWrap}>
                <Swords size={20} color={colors.brassLight} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerEyebrow}>REGIA & TAVOLI DI GIOCO</Text>
                <Text style={styles.headerTitle}>Nuova Sessione</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={20} color={colors.parchmentMuted} />
            </TouchableOpacity>
          </View>

          {/* Form Body */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Active Campaign Indicator with switcher */}
            <View style={styles.campaignPillRow}>
              <Text style={styles.inputLabel}>CAMPAGNA DI GIOCO</Text>
              <TouchableOpacity
                style={styles.campaignPillBtn}
                onPress={() => setCampaignModalVisible(true)}
                activeOpacity={0.8}
              >
                <Crown size={13} color={colors.brassBase} />
                <Text style={styles.campaignPillText} numberOfLines={1}>
                  {activeCampaign?.name || 'Seleziona Campagna'}
                </Text>
                <Text style={styles.campaignPillChange}>Cambia ▾</Text>
              </TouchableOpacity>
            </View>

            {/* Session Title / Chapter */}
            <View style={styles.fieldGroup}>
              <Text style={styles.inputLabel}>TITOLO / CAPITOLO DELLA SESSIONE *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="es. Capitolo 5: L’Antro del Tiranno Occhiuto"
                placeholderTextColor={colors.parchmentMuted}
                value={title}
                onChangeText={setTitle}
              />

              {/* Suggestions chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.suggestionsScroll}
              >
                {TITLE_SUGGESTIONS.map((sugg, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.suggChip}
                    onPress={() => setTitle(sugg)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.suggChipText}>{sugg}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Date Selection */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelWithIconRow}>
                <Calendar size={14} color={colors.brassLight} />
                <Text style={styles.inputLabel}>DATA DELLA SESSIONE (AAAA-MM-GG) *</Text>
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="2026-10-15"
                placeholderTextColor={colors.parchmentMuted}
                value={date}
                onChangeText={setDate}
                keyboardType="numbers-and-punctuation"
              />

              {/* Quick Date Presets */}
              <View style={styles.presetsRow}>
                <TouchableOpacity
                  style={[styles.presetBtn, date === getFormattedDate(0) && styles.presetBtnActive]}
                  onPress={() => setDate(getFormattedDate(0))}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.presetText, date === getFormattedDate(0) && styles.presetTextActive]}>
                    Oggi
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.presetBtn, date === getFormattedDate(1) && styles.presetBtnActive]}
                  onPress={() => setDate(getFormattedDate(1))}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.presetText, date === getFormattedDate(1) && styles.presetTextActive]}>
                    Domani
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.presetBtn, date === getNextDayOfWeek(5) && styles.presetBtnActive]}
                  onPress={() => setDate(getNextDayOfWeek(5))}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.presetText, date === getNextDayOfWeek(5) && styles.presetTextActive]}>
                    Venerdì
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.presetBtn, date === getNextDayOfWeek(6) && styles.presetBtnActive]}
                  onPress={() => setDate(getNextDayOfWeek(6))}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.presetText, date === getNextDayOfWeek(6) && styles.presetTextActive]}>
                    Sabato
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Time & Max Players Row */}
            <View style={styles.dualFieldRow}>
              {/* Time */}
              <View style={{ flex: 1.2 }}>
                <View style={styles.labelWithIconRow}>
                  <Clock size={14} color={colors.brassLight} />
                  <Text style={styles.inputLabel}>ORARIO (HH:MM) *</Text>
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="21:00"
                  placeholderTextColor={colors.parchmentMuted}
                  value={time}
                  onChangeText={setTime}
                  keyboardType="numbers-and-punctuation"
                />
              </View>

              {/* Max Players Stepper */}
              <View style={{ flex: 1 }}>
                <View style={styles.labelWithIconRow}>
                  <Users size={14} color={colors.brassLight} />
                  <Text style={styles.inputLabel}>POSTI MAX</Text>
                </View>
                <View style={styles.stepperContainer}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setMaxPlayers((prev) => Math.max(1, prev - 1))}
                    activeOpacity={0.7}
                  >
                    <Minus size={14} color={colors.parchmentLight} />
                  </TouchableOpacity>
                  <Text style={styles.stepperVal}>{maxPlayers}</Text>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setMaxPlayers((prev) => Math.min(20, prev + 1))}
                    activeOpacity={0.7}
                  >
                    <Plus size={14} color={colors.parchmentLight} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Time Presets Strip */}
            <View style={styles.timePresetsRow}>
              {TIME_PRESETS.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.timeChip, time === t && styles.timeChipActive]}
                  onPress={() => setTime(t)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.timeChipText, time === t && styles.timeChipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Location / Table */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelWithIconRow}>
                <MapPin size={14} color={colors.brassLight} />
                <Text style={styles.inputLabel}>LUOGO / TAVOLO ASSEGNATO</Text>
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="es. Tavolo 1 - Taverna del Barbiere"
                placeholderTextColor={colors.parchmentMuted}
                value={location}
                onChangeText={setLocation}
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.suggestionsScroll}
              >
                {LOCATION_PRESETS.map((loc) => (
                  <TouchableOpacity
                    key={loc}
                    style={[styles.suggChip, location === loc && styles.suggChipActive]}
                    onPress={() => setLocation(loc)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.suggChipText, location === loc && styles.suggChipTextActive]}>
                      {loc}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Public Notes / Synopsis */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelWithIconRow}>
                <BookOpen size={14} color={colors.parchmentMuted} />
                <Text style={styles.inputLabel}>NOTE PUBBLICHE (SINOSSI PER I GIOCATORI)</Text>
              </View>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Descrivi cosa attende gli avventurieri (requisiti di livello, atmosfera, preparazione)..."
                placeholderTextColor={colors.parchmentMuted}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* GM Private Notes */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelWithIconRow}>
                <Lock size={14} color={colors.brassBase} />
                <Text style={[styles.inputLabel, { color: colors.brassLight }]}>
                  NOTE SEGRETE DEL MASTER (SOLO GM)
                </Text>
              </View>
              <TextInput
                style={[styles.textInput, styles.textArea, styles.gmNotesArea]}
                placeholder="Canovaccio segreto, CD dei salvataggi, tesori celati, trappole o colpi di scena..."
                placeholderTextColor={colors.parchmentMuted}
                value={gmPrivateNotes}
                onChangeText={setGmPrivateNotes}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={isSubmitting}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Annulla</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.createButton, isSubmitting && styles.createButtonDisabled]}
              onPress={handleCreate}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={colors.void} />
              ) : (
                <>
                  <Sparkles size={16} color={colors.void} />
                  <Text style={styles.createButtonText}>Conferma & Crea Sessione</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Campaign Switcher Modal */}
        <CampaignSelectorModal
          visible={campaignModalVisible}
          onClose={() => setCampaignModalVisible(false)}
        />
      </KeyboardAvoidingView>
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.brassDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerEyebrow: {
    fontSize: 9.5,
    fontWeight: '800',
    color: colors.brassLight,
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.parchmentLight,
    letterSpacing: 0.3,
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
  campaignPillRow: {
    gap: 6,
  },
  campaignPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.brassDark,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  campaignPillText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.parchmentLight,
  },
  campaignPillChange: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brassLight,
  },
  fieldGroup: {
    gap: 6,
  },
  labelWithIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inputLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: colors.parchmentMuted,
    letterSpacing: 0.6,
  },
  textInput: {
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.parchmentLight,
  },
  textArea: {
    minHeight: 68,
    textAlignVertical: 'top',
  },
  gmNotesArea: {
    borderColor: colors.brassDark,
    backgroundColor: colors.void,
  },
  suggestionsScroll: {
    gap: 6,
    paddingTop: 6,
  },
  suggChip: {
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  suggChipActive: {
    borderColor: colors.brassBase,
    backgroundColor: colors.brassDark + '33',
  },
  suggChipText: {
    fontSize: 11,
    color: colors.parchmentMuted,
    fontWeight: '600',
  },
  suggChipTextActive: {
    color: colors.brassLight,
    fontWeight: '700',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 4,
  },
  presetBtn: {
    flex: 1,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  presetBtnActive: {
    backgroundColor: colors.brassBase + '25',
    borderColor: colors.brassBase,
  },
  presetText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.parchmentMuted,
  },
  presetTextActive: {
    color: colors.brassLight,
    fontWeight: '700',
  },
  dualFieldRow: {
    flexDirection: 'row',
    gap: 12,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  stepperBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: colors.stoneSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperVal: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.brassLight,
  },
  timePresetsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: -8,
  },
  timeChip: {
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  timeChipActive: {
    backgroundColor: colors.brassBase + '33',
    borderColor: colors.brassBase,
  },
  timeChipText: {
    fontSize: 11,
    color: colors.parchmentMuted,
    fontWeight: '600',
  },
  timeChipTextActive: {
    color: colors.brassLight,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.stone,
    borderTopWidth: 1,
    borderTopColor: colors.stoneBorder,
  },
  cancelButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 13,
    color: colors.parchmentMuted,
    fontWeight: '600',
  },
  createButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.brassBase,
    borderRadius: 8,
    paddingVertical: 12,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.void,
    letterSpacing: 0.4,
  },
});
