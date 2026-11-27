import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Bell,
  ChevronRight,
  Circle,
  CloudRain,
  Flame,
  Footprints,
  Moon,
  Play,
  Radio,
  Shield,
  SkipBack,
  SkipForward,
  Skull,
  Sparkles,
  Square,
  Swords,
  Volume2,
  VolumeX,
  Wind,
  X,
  Zap,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useGmLive } from '../../contexts/GmLiveContext';
import type { SfxSlot } from '../../screens/gm/GmAudioRemoteScreen';

const DEFAULT_SFX_SLOTS: SfxSlot[] = [
  { slotIndex: 0, iconKey: 'Bell', etichetta: 'Campana' },
  { slotIndex: 1, iconKey: 'Skull', etichetta: 'Morte' },
  { slotIndex: 2, iconKey: 'Flame', etichetta: 'Fuoco' },
  { slotIndex: 3, iconKey: 'Zap', etichetta: 'Fulmine' },
  { slotIndex: 4, iconKey: 'Volume2', etichetta: 'Ruggito' },
  { slotIndex: 5, iconKey: 'Wind', etichetta: 'Vento' },
  { slotIndex: 6, iconKey: 'CloudRain', etichetta: 'Pioggia' },
  { slotIndex: 7, iconKey: 'Swords', etichetta: 'Acciaio' },
  { slotIndex: 8, iconKey: 'Shield', etichetta: 'Difesa' },
  { slotIndex: 9, iconKey: 'Footprints', etichetta: 'Passi' },
  { slotIndex: 10, iconKey: 'Moon', etichetta: 'Notte' },
  { slotIndex: 11, iconKey: 'Sparkles', etichetta: 'Magia' },
];

const SFX_ICON_MAP: Record<string, React.FC<any>> = {
  Bell,
  Skull,
  Flame,
  Zap,
  Volume2,
  Wind,
  CloudRain,
  Swords,
  Shield,
  Footprints,
  Moon,
  Sparkles,
};

export interface GmQuickAudioSheetProps {
  visible: boolean;
  pcOnline: boolean;
  onClose: () => void;
  onOpenFullAudio: () => void;
}

export const GmQuickAudioSheet: React.FC<GmQuickAudioSheetProps> = ({
  visible,
  pcOnline,
  onClose,
  onOpenFullAudio,
}) => {
  const live = useGmLive();
  const [sfxSlots, setSfxSlots] = useState<SfxSlot[]>(DEFAULT_SFX_SLOTS);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(75);
  const [statusLine, setStatusLine] = useState('Pronto');

  const syncSfxLabels = useCallback(async () => {
    if (!live.pairing) return;
    try {
      const origin = live.pairing.baseUrl.replace(/\/+$/, '');
      const res = await fetch(`${origin}/api/gm-remote/${live.pairing.publicId}/sfx-pad-state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: live.pairing.token }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok && Array.isArray(data.snapshot?.slots) && data.snapshot.slots.length === 12) {
        setSfxSlots(data.snapshot.slots);
      }
    } catch {
      // Keep default slot labels when unreachable
    }
  }, [live.pairing]);

  useEffect(() => {
    if (visible && pcOnline) {
      void syncSfxLabels();
    }
  }, [visible, pcOnline, syncSfxLabels]);

  const dispatchAudio = async (type: string, payload: Record<string, unknown> = {}) => {
    if (!pcOnline) {
      setStatusLine('PC offline · collega il GM Screen');
      return false;
    }
    const res = await live.sendCommand(type, payload);
    setStatusLine(res.ok ? `Inviato: ${type.replace('audio.', '')}` : `Errore: ${res.error || 'rifiutato'}`);
    return res.ok;
  };

  const adjustVolume = (delta: number) => {
    const next = Math.max(0, Math.min(100, volume + delta));
    void dispatchAudio('audio.music_master_volume', { value: next / 100 }).then((ok) => {
      if (ok) {
        setVolume(next);
        if (next > 0 && isMuted) setIsMuted(false);
      }
    });
  };

  const toggleMute = () => {
    const next = !isMuted;
    void dispatchAudio('audio.music_mute', { muted: next }).then((ok) => {
      if (ok) setIsMuted(next);
    });
  };

  const firePad = (slot: SfxSlot) => {
    void dispatchAudio('audio.sfx_pad_slot', { slot_index: slot.slotIndex }).then((ok) => {
      if (!ok) return;
      setActiveSlot(slot.slotIndex);
      setTimeout(() => setActiveSlot(null), 280);
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <Radio size={18} color={colors.brassLight} />
              <View style={{ flex: 1 }}>
                <Text style={styles.eyebrow}>QUICK AUDIO & SFX</Text>
                <Text style={styles.status} numberOfLines={1}>
                  {pcOnline ? statusLine : 'PC non collegato · sola anteprima'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Chiudi pannello audio rapido"
            >
              <X size={20} color={colors.parchmentLight} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            {/* Transport & Volume Row */}
            <View style={styles.transportCard}>
              <View style={styles.transportRow}>
                <TouchableOpacity
                  style={styles.iconBtn}
                  disabled={!pcOnline}
                  onPress={() => void dispatchAudio('audio.music_prev')}
                  accessibilityRole="button"
                  accessibilityLabel="Traccia precedente"
                >
                  <SkipBack size={18} color={colors.parchmentLight} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.playBtn}
                  disabled={!pcOnline}
                  onPress={() => void dispatchAudio('audio.music_play_pause')}
                  accessibilityRole="button"
                  accessibilityLabel="Play o Pausa musica"
                >
                  <Play size={22} color={colors.void} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconBtn}
                  disabled={!pcOnline}
                  onPress={() => void dispatchAudio('audio.music_next')}
                  accessibilityRole="button"
                  accessibilityLabel="Traccia successiva"
                >
                  <SkipForward size={18} color={colors.parchmentLight} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.stopBtn}
                  disabled={!pcOnline}
                  onPress={() => void dispatchAudio('audio.stop_all')}
                  accessibilityRole="button"
                  accessibilityLabel="Ferma tutti i suoni"
                >
                  <Square size={14} color={colors.crimsonLight} />
                  <Text style={styles.stopText}>Stop</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.volumeRow}>
                <TouchableOpacity
                  style={styles.volChip}
                  disabled={!pcOnline}
                  onPress={toggleMute}
                  accessibilityRole="button"
                  accessibilityLabel={isMuted ? 'Riattiva audio' : 'Silenzia audio'}
                >
                  {isMuted ? (
                    <VolumeX size={16} color={colors.crimsonLight} />
                  ) : (
                    <Volume2 size={16} color={colors.brassLight} />
                  )}
                  <Text style={styles.volLabel}>{isMuted ? 'Muto' : `${volume}%`}</Text>
                </TouchableOpacity>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={styles.volStepBtn}
                    disabled={!pcOnline}
                    onPress={() => adjustVolume(-10)}
                  >
                    <Text style={styles.volStepText}>−10%</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.volStepBtn}
                    disabled={!pcOnline}
                    onPress={() => adjustVolume(10)}
                  >
                    <Text style={styles.volStepText}>+10%</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* 12 SFX Pads */}
            <Text style={styles.sectionTitle}>PAD EFFETTI SONORI (12 SLOT PC)</Text>
            <View style={styles.grid}>
              {sfxSlots.map((slot) => {
                const IconComp = SFX_ICON_MAP[slot.iconKey] ?? Circle;
                const fired = activeSlot === slot.slotIndex;
                return (
                  <TouchableOpacity
                    key={slot.slotIndex}
                    disabled={!pcOnline}
                    style={[styles.pad, fired && styles.padActive, !pcOnline && { opacity: 0.45 }]}
                    onPress={() => firePad(slot)}
                    activeOpacity={0.7}
                  >
                    <IconComp size={16} color={fired ? colors.void : colors.brassLight} />
                    <Text
                      style={[styles.padLabel, fired && { color: colors.void }]}
                      numberOfLines={1}
                    >
                      {slot.etichetta || `Pad ${slot.slotIndex + 1}`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.fullMixerBtn}
              onPress={() => {
                onClose();
                onOpenFullAudio();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.fullMixerText}>Apri Mixer & Catalogo Tracce Completo</Text>
              <ChevronRight size={16} color={colors.brassLight} />
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
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
    maxHeight: '84%',
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
    paddingVertical: 12,
    backgroundColor: colors.stone,
    borderBottomWidth: 1,
    borderBottomColor: colors.stoneBorder,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  eyebrow: {
    color: colors.brassLight,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  status: {
    color: colors.parchmentMuted,
    fontSize: 12,
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
    paddingBottom: 28,
    gap: 12,
  },
  transportCard: {
    backgroundColor: colors.stone,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 12,
    gap: 10,
  },
  transportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  iconBtn: {
    minWidth: 46,
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    minWidth: 58,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.brassBase,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopBtn: {
    minHeight: 46,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
    borderWidth: 1,
    borderColor: colors.crimson,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stopText: {
    color: colors.crimsonLight,
    fontSize: 12,
    fontWeight: '800',
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  volChip: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.stoneSurface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  volLabel: {
    color: colors.parchmentLight,
    fontSize: 13,
    fontWeight: '800',
  },
  volStepBtn: {
    minHeight: 44,
    minWidth: 58,
    borderRadius: 8,
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  volStepText: {
    color: colors.brassLight,
    fontSize: 12,
    fontWeight: '800',
  },
  sectionTitle: {
    color: colors.brassLight,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pad: {
    width: '31%',
    minHeight: 54,
    borderRadius: 10,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingHorizontal: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  padActive: {
    backgroundColor: colors.brassBase,
    borderColor: colors.brassLight,
  },
  padLabel: {
    color: colors.parchmentLight,
    fontSize: 11,
    fontWeight: '700',
  },
  fullMixerBtn: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.brassDark,
    backgroundColor: colors.stone,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  fullMixerText: {
    color: colors.brassLight,
    fontSize: 13,
    fontWeight: '800',
  },
});
