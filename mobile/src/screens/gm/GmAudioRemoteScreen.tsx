import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  Radio,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Sparkles,
  Flame,
  CloudRain,
  Skull,
  Bell,
  Zap,
  Wind,
  Footprints,
  Moon,
  Swords,
  Shield,
  Circle,
  Sliders,
  SkipBack,
  SkipForward,
  Square,
  RefreshCw,
  Link,
  Unlink,
  Check,
  X,
  KeyRound,
  QrCode,
  Music,
  Disc,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useGmCampaigns } from '../../hooks/useGmCampaigns';
import { supabase, ExpoSecureStoreAdapter } from '../../api/supabase';
import { GmQrScannerModal } from '../../components/gm/GmQrScannerModal';
import { parseGmRemoteQr, ParsedGmRemoteQr } from '../../utils/qrParser';

export interface SfxSlot {
  slotIndex: number;
  iconKey: string;
  etichetta: string;
}

export interface GlobalMusicTrack {
  id: string;
  title: string;
  mood: string | null;
}

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

function getSfxIconComponent(key: string): React.FC<any> {
  return SFX_ICON_MAP[key] ?? Circle;
}

function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const STORAGE_KEY_PAIRING = 'gm_audio_remote_pairing';
const DEFAULT_WEB_BASE = 'https://www.barberanddragons.com';

export const GmAudioRemoteScreen: React.FC = () => {
  const { activeCampaign } = useGmCampaigns();

  // Connection & Pairing State
  const [pairingModalOpen, setPairingModalOpen] = useState<boolean>(false);
  const [scannerModalOpen, setScannerModalOpen] = useState<boolean>(false);
  const [sessionPublicId, setSessionPublicId] = useState<string>('');
  const [remoteToken, setRemoteToken] = useState<string>('');
  const [baseUrl, setBaseUrl] = useState<string>(DEFAULT_WEB_BASE);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isSearchingSession, setIsSearchingSession] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Playback & Audio State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(75);
  const [nowPlayingTrackTitle, setNowPlayingTrackTitle] = useState<string | null>(null);
  const [activePadSlot, setActivePadSlot] = useState<number | null>(null);
  const [lastCommandInfo, setLastCommandInfo] = useState<string>('Pronto a trasmettere');
  const [isTransmitting, setIsTransmitting] = useState<boolean>(false);

  // Real Remote Data from Site
  const [sfxSlots, setSfxSlots] = useState<SfxSlot[]>(DEFAULT_SFX_SLOTS);
  const [catalogTracks, setCatalogTracks] = useState<GlobalMusicTrack[]>([]);
  const [catalogLoading, setCatalogLoading] = useState<boolean>(false);

  // Load saved pairing from persistent storage on mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const saved = await ExpoSecureStoreAdapter.getItem(STORAGE_KEY_PAIRING);
        if (saved && isMounted) {
          const parsed = JSON.parse(saved);
          if (parsed.publicId) {
            setSessionPublicId(parsed.publicId);
            setRemoteToken(parsed.token || '');
            setBaseUrl(parsed.baseUrl || DEFAULT_WEB_BASE);
            setIsConnected(true);
          }
        }
      } catch (e) {
        console.warn('[GmAudioRemote] Error reading stored pairing:', e);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Save pairing to persistent storage
  const savePairingToStorage = useCallback(async (pubId: string, tok: string, base: string) => {
    try {
      if (pubId) {
        await ExpoSecureStoreAdapter.setItem(
          STORAGE_KEY_PAIRING,
          JSON.stringify({ publicId: pubId, token: tok, baseUrl: base })
        );
      } else {
        await ExpoSecureStoreAdapter.removeItem(STORAGE_KEY_PAIRING);
      }
    } catch (e) {
      console.warn('[GmAudioRemote] Error writing stored pairing:', e);
    }
  }, []);

  // Fetch real SFX Pad Snapshot from website API
  const fetchSfxState = useCallback(async (base: string, pubId: string, tok: string) => {
    if (!pubId || !tok) return;
    try {
      const origin = base.replace(/\/+$/, '');
      const res = await fetch(`${origin}/api/gm-remote/${pubId}/sfx-pad-state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tok }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        snapshot?: { slots?: SfxSlot[] };
      };
      if (res.ok && data.ok && Array.isArray(data.snapshot?.slots) && data.snapshot.slots.length === 12) {
        setSfxSlots(data.snapshot.slots);
      }
    } catch (e) {
      console.warn('[GmAudioRemote] fetchSfxState error:', e);
    }
  }, []);

  // Fetch Global Music Tracks from website API
  const fetchCatalogTracks = useCallback(async (base: string, pubId: string, tok: string) => {
    if (!pubId || !tok) return;
    setCatalogLoading(true);
    try {
      const origin = base.replace(/\/+$/, '');
      const res = await fetch(`${origin}/api/gm-remote/${pubId}/global-music-tracks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tok }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        tracks?: GlobalMusicTrack[];
      };
      if (res.ok && data.ok && Array.isArray(data.tracks)) {
        setCatalogTracks(data.tracks);
      }
    } catch (e) {
      console.warn('[GmAudioRemote] fetchCatalogTracks error:', e);
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  // Refresh remote data when connected
  const refreshRemoteData = useCallback(async () => {
    if (!sessionPublicId || !remoteToken) return;
    setIsRefreshing(true);
    await Promise.all([
      fetchSfxState(baseUrl, sessionPublicId, remoteToken),
      fetchCatalogTracks(baseUrl, sessionPublicId, remoteToken),
    ]);
    setIsRefreshing(false);
  }, [baseUrl, sessionPublicId, remoteToken, fetchSfxState, fetchCatalogTracks]);

  useEffect(() => {
    if (isConnected && sessionPublicId && remoteToken) {
      void refreshRemoteData();
    }
  }, [isConnected, sessionPublicId, remoteToken, refreshRemoteData]);

  // Realtime subscription to gm_remote_commands to sync playback state
  useEffect(() => {
    if (!sessionPublicId) return;

    const channel = supabase
      .channel(`gm-remote-${sessionPublicId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gm_remote_commands',
          filter: `session_public_id=eq.${sessionPublicId}`,
        },
        (payload) => {
          const rec: any = payload.new;
          if (!rec) return;

          const type: string = rec.type;
          const pl: Record<string, any> = rec.payload || {};

          if (type === 'audio.music_play_pause') {
            setIsPlaying((prev) => !prev);
            setLastCommandInfo('Play/Pause');
          } else if (type === 'audio.stop_all') {
            setIsPlaying(false);
            setNowPlayingTrackTitle(null);
            setLastCommandInfo('Stop tutto');
          } else if (type === 'audio.music_master_volume') {
            if (typeof pl.value === 'number') {
              setVolume(Math.round(pl.value * 100));
            }
            setLastCommandInfo(`Volume: ${Math.round((pl.value ?? 0.75) * 100)}%`);
          } else if (type === 'audio.music_mute') {
            setIsMuted(Boolean(pl.muted));
            setLastCommandInfo(pl.muted ? 'Muto' : 'Volume ripristinato');
          } else if (type === 'audio.music_play_global_catalog') {
            setIsPlaying(true);
            if (pl.title) {
              setNowPlayingTrackTitle(pl.title);
            }
            setLastCommandInfo(`Musica: ${pl.title || 'Catalogo'}`);
          } else if (type === 'audio.sfx_pad_slot') {
            if (typeof pl.slot_index === 'number') {
              setActivePadSlot(pl.slot_index);
              setTimeout(() => setActivePadSlot(null), 300);
            }
            setLastCommandInfo(`SFX Pad ${Number(pl.slot_index) + 1}`);
          } else {
            setLastCommandInfo(`Eseguito: ${type.replace('audio.', '')}`);
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionPublicId]);

  // Send Command to website API endpoint
  const sendCommand = async (type: string, payload: Record<string, unknown> = {}) => {
    const pubId = sessionPublicId.trim();
    const tok = remoteToken.trim();

    if (!pubId || !tok) {
      setPairingModalOpen(true);
      return;
    }

    setIsTransmitting(true);
    setLastCommandInfo(`Inviando ${type.replace('audio.', '')}...`);

    try {
      const origin = baseUrl.replace(/\/+$/, '');
      const url = `${origin}/api/gm-remote/${pubId}/command`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: tok,
          command_id: generateUuid(),
          type,
          payload,
          issued_at: new Date().toISOString(),
          source: 'remote',
        }),
      });

      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

      if (!res.ok || !json.ok) {
        const errCode = json?.error || `HTTP ${res.status}`;
        if (errCode === 'session_expired' || errCode === 'session_revoked') {
          Alert.alert('Sessione Scaduta', 'La sessione del telecomando sul PC è scaduta. Inquadra un nuovo QR code.');
          setIsConnected(false);
        } else if (errCode === 'invalid_token') {
          Alert.alert('Token Non Valido', 'Il token del telecomando non è valido. Effettua una nuova scansione.');
        } else {
          Alert.alert('Errore Invio', `Impossibile trasmettere il comando: ${errCode}`);
        }
        setLastCommandInfo(`Errore: ${errCode}`);
        return;
      }

      setLastCommandInfo(`Eseguito: ${type.replace('audio.', '')}`);
    } catch (err: any) {
      console.warn('[GmAudioRemote] sendCommand exception:', err);
      Alert.alert(
        'Errore di Connessione',
        `Impossibile raggiungere il server all’indirizzo:\n${baseUrl}\n\nVerifica che il PC sia online e raggiungibile.`
      );
      setLastCommandInfo('Errore di connessione');
    } finally {
      setIsTransmitting(false);
    }
  };

  // Music controls actions
  const togglePlayPause = () => {
    const next = !isPlaying;
    setIsPlaying(next);
    void sendCommand('audio.music_play_pause', {});
  };

  const skipNext = () => {
    void sendCommand('audio.music_next', {});
  };

  const skipPrev = () => {
    void sendCommand('audio.music_prev', {});
  };

  const toggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    void sendCommand('audio.music_mute', { muted: nextMute });
  };

  const changeVolume = (newVal: number) => {
    const clamped = Math.max(0, Math.min(100, newVal));
    setVolume(clamped);
    if (isMuted && clamped > 0) {
      setIsMuted(false);
    }
    void sendCommand('audio.music_master_volume', { value: clamped / 100 });
  };

  const stopAllAudio = () => {
    setIsPlaying(false);
    setNowPlayingTrackTitle(null);
    void sendCommand('audio.stop_all', {});
  };

  // Trigger SFX pad
  const triggerSfxPad = (slot: SfxSlot) => {
    setActivePadSlot(slot.slotIndex);
    setTimeout(() => setActivePadSlot(null), 300);

    void sendCommand('audio.sfx_pad_slot', {
      slot_index: slot.slotIndex,
    });
  };

  // Play global catalog track
  const playCatalogTrack = (track: GlobalMusicTrack) => {
    setNowPlayingTrackTitle(track.title);
    setIsPlaying(true);
    void sendCommand('audio.music_play_global_catalog', {
      global_track_id: track.id,
      title: track.title,
    });
  };

  // Handle successful QR scan from camera
  const handleScannedQr = (result: ParsedGmRemoteQr) => {
    setSessionPublicId(result.publicId);
    setRemoteToken(result.token || '');
    setBaseUrl(result.baseUrl);
    setIsConnected(true);
    setPairingModalOpen(false);

    void savePairingToStorage(result.publicId, result.token || '', result.baseUrl);
    void fetchSfxState(result.baseUrl, result.publicId, result.token || '');
    void fetchCatalogTracks(result.baseUrl, result.publicId, result.token || '');

    Alert.alert(
      'Telecomando Connesso! 🐉',
      `Collegato con successo al GM Screen.\n\nSessione: ${result.publicId.slice(0, 13)}...\nHost: ${result.baseUrl}`
    );
  };

  // Handle manual pairing save
  const handleSaveManualPairing = () => {
    const parsed = parseGmRemoteQr(sessionPublicId, baseUrl);
    if (!parsed) {
      Alert.alert('Codice Mancante', 'Inserisci un Session Public ID valido o incolla il link completo del QR.');
      return;
    }

    const finalToken = remoteToken.trim() || parsed.token || '';
    const finalBaseUrl = parsed.baseUrl || baseUrl.trim() || DEFAULT_WEB_BASE;

    setSessionPublicId(parsed.publicId);
    setRemoteToken(finalToken);
    setBaseUrl(finalBaseUrl);
    setIsConnected(true);
    setPairingModalOpen(false);

    void savePairingToStorage(parsed.publicId, finalToken, finalBaseUrl);
    void fetchSfxState(finalBaseUrl, parsed.publicId, finalToken);
    void fetchCatalogTracks(finalBaseUrl, parsed.publicId, finalToken);

    Alert.alert('Telecomando Connesso', `Collegato alla sessione:\n${parsed.publicId.slice(0, 18)}...`);
  };

  const disconnectSession = () => {
    setIsConnected(false);
    setSessionPublicId('');
    setRemoteToken('');
    setLastCommandInfo('Disconnesso');
    void savePairingToStorage('', '', DEFAULT_WEB_BASE);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshRemoteData}
            tintColor={colors.brassLight}
            colors={[colors.brassBase]}
          />
        }
      >
        {/* Pairing Status Banner */}
        <View style={styles.pairingBanner}>
          <View style={styles.pairingLeft}>
            <View
              style={[
                styles.pairingStatusDot,
                isConnected ? styles.dotConnected : styles.dotDisconnected,
              ]}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.pairingTitle}>
                {isConnected ? 'COLLEGATO AL GM SCREEN (PC)' : 'TELECOMANDO NON COLLEGATO'}
              </Text>
              <Text style={styles.pairingSub} numberOfLines={1}>
                {isConnected
                  ? `ID: ${sessionPublicId.slice(0, 13)}... • ${baseUrl.replace(/^https?:\/\//, '')}`
                  : 'Scansiona il QR Code mostrato sul sito per controllare l’audio'}
              </Text>
            </View>
          </View>

          <View style={styles.pairingBannerActions}>
            <TouchableOpacity
              style={styles.scanQrBannerBtn}
              onPress={() => setScannerModalOpen(true)}
              activeOpacity={0.8}
            >
              <QrCode size={14} color={colors.void} />
              <Text style={styles.scanQrBannerBtnText}>Scansiona QR</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pairingActionBtn}
              onPress={() => setPairingModalOpen(true)}
              activeOpacity={0.8}
            >
              <Sliders size={13} color={colors.parchmentLight} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Master Playback Console */}
        <View style={styles.masterDeck}>
          <View style={styles.masterDeckHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
              <Radio size={16} color={colors.brassLight} />
              <View style={{ flex: 1 }}>
                <Text style={styles.deckTitle}>REGIA MUSICA & MIXER</Text>
                {nowPlayingTrackTitle ? (
                  <Text style={styles.nowPlayingSubtitle} numberOfLines={1}>
                    In onda: <Text style={styles.nowPlayingHighlight}>{nowPlayingTrackTitle}</Text>
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={styles.transmissionTag}>
              {isTransmitting && <ActivityIndicator size="small" color={colors.brassLight} />}
              <Text style={styles.transmissionText} numberOfLines={1}>
                {lastCommandInfo}
              </Text>
            </View>
          </View>

          {/* Big Playback Transport Controls */}
          <View style={styles.transportRow}>
            {/* Prev Track */}
            <TouchableOpacity style={styles.transportBtn} onPress={skipPrev} activeOpacity={0.7}>
              <SkipBack size={22} color={colors.parchmentLight} />
            </TouchableOpacity>

            {/* Play / Pause Big Button */}
            <TouchableOpacity
              style={[styles.bigPlayBtn, isPlaying && styles.bigPlayBtnPlaying]}
              onPress={togglePlayPause}
              activeOpacity={0.85}
            >
              {isPlaying ? (
                <Pause size={30} color={colors.void} />
              ) : (
                <Play size={30} color={colors.void} style={{ marginLeft: 3 }} />
              )}
            </TouchableOpacity>

            {/* Next Track */}
            <TouchableOpacity style={styles.transportBtn} onPress={skipNext} activeOpacity={0.7}>
              <SkipForward size={22} color={colors.parchmentLight} />
            </TouchableOpacity>

            {/* Stop All Emergency Button */}
            <TouchableOpacity
              style={styles.stopAllBtn}
              onPress={stopAllAudio}
              activeOpacity={0.7}
            >
              <Square size={16} color={colors.crimsonLight} />
              <Text style={styles.stopAllText}>Stop All</Text>
            </TouchableOpacity>
          </View>

          {/* Master Volume Controls */}
          <View style={styles.volumeConsole}>
            <View style={styles.volumeHeader}>
              <TouchableOpacity onPress={toggleMute} style={styles.muteBtn} activeOpacity={0.7}>
                {isMuted || volume === 0 ? (
                  <VolumeX size={18} color={colors.crimsonLight} />
                ) : volume < 50 ? (
                  <Volume1 size={18} color={colors.brassLight} />
                ) : (
                  <Volume2 size={18} color={colors.brassLight} />
                )}
                <Text style={[styles.volumeValueText, isMuted && { color: colors.crimsonLight }]}>
                  {isMuted ? 'MUTED' : `${volume}%`}
                </Text>
              </TouchableOpacity>

              {/* Incremental volume adjustment buttons */}
              <View style={styles.volStepRow}>
                <TouchableOpacity
                  style={styles.volStepBtn}
                  onPress={() => changeVolume(volume - 10)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.volStepBtnText}>-10%</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.volStepBtn}
                  onPress={() => changeVolume(volume + 10)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.volStepBtnText}>+10%</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Volume Presets */}
            <View style={styles.presetChipsRow}>
              {[0, 25, 50, 75, 100].map((v) => (
                <TouchableOpacity
                  key={v}
                  style={[
                    styles.presetVolChip,
                    volume === v && !isMuted && styles.presetVolChipActive,
                  ]}
                  onPress={() => changeVolume(v)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.presetVolText,
                      volume === v && !isMuted && styles.presetVolTextActive,
                    ]}
                  >
                    {v}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* 12 SFX Soundboard Section (Synchronized with Website PC Audio) */}
        <View style={styles.sectionHeader}>
          <Sparkles size={16} color={colors.brassBase} />
          <Text style={styles.sectionTitle}>SOUNDBOARD SFX (12 TASTI SINCRONIZZATI SUL PC)</Text>
        </View>

        <View style={styles.sfxGrid}>
          {sfxSlots.map((slot) => {
            const isFired = activePadSlot === slot.slotIndex;
            const IconComp = getSfxIconComponent(slot.iconKey);

            return (
              <TouchableOpacity
                key={slot.slotIndex}
                style={[styles.sfxPadCard, isFired && styles.sfxPadCardActive]}
                onPress={() => triggerSfxPad(slot)}
                activeOpacity={0.65}
              >
                <View style={styles.sfxPadTop}>
                  <View style={styles.sfxIconCircle}>
                    <IconComp size={16} color={isFired ? colors.void : colors.brassLight} />
                  </View>
                  <Text style={styles.sfxSlotBadge}>PAD {slot.slotIndex + 1}</Text>
                </View>
                <Text style={styles.sfxPadLabel} numberOfLines={1}>
                  {slot.etichetta || `Tasto ${slot.slotIndex + 1}`}
                </Text>
                <Text style={styles.sfxPadSub} numberOfLines={1}>
                  {slot.iconKey}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Guild Music Tracks Catalog Section */}
        {isConnected && catalogTracks.length > 0 && (
          <View style={styles.catalogSection}>
            <View style={styles.sectionHeader}>
              <Music size={16} color={colors.emerald} />
              <Text style={styles.sectionTitle}>MUSICA CATALOGO GILDA (SUL PC)</Text>
            </View>

            <View style={styles.catalogList}>
              {catalogTracks.map((track) => {
                const isSelected = nowPlayingTrackTitle === track.title;
                return (
                  <TouchableOpacity
                    key={track.id}
                    style={[styles.catalogTrackCard, isSelected && styles.catalogTrackCardActive]}
                    onPress={() => playCatalogTrack(track)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.catalogTrackLeft}>
                      <Disc
                        size={18}
                        color={isSelected ? colors.emerald : colors.parchmentMuted}
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[styles.catalogTrackTitle, isSelected && styles.catalogTrackTitleActive]}
                          numberOfLines={1}
                        >
                          {track.title}
                        </Text>
                        {track.mood ? (
                          <Text style={styles.catalogTrackMood} numberOfLines={1}>
                            {track.mood}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    <View style={styles.catalogPlayBadge}>
                      <Play size={12} color={colors.void} />
                      <Text style={styles.catalogPlayBadgeText}>Riproduci</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Camera QR Scanner Modal */}
      <GmQrScannerModal
        visible={scannerModalOpen}
        onClose={() => setScannerModalOpen(false)}
        onScan={handleScannedQr}
      />

      {/* Pairing Setup Modal */}
      <Modal
        visible={pairingModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPairingModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setPairingModalOpen(false)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <KeyRound size={18} color={colors.brassLight} />
                <Text style={styles.modalTitle}>CONFIGURAZIONE TELECOMANDO GM</Text>
              </View>
              <TouchableOpacity onPress={() => setPairingModalOpen(false)}>
                <X size={18} color={colors.parchmentMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Inquadra il codice QR mostrato sullo schermo del PC (pulsante Telecomando sul GM
              screen) per sincronizzare istantaneamente comandi e audio.
            </Text>

            {/* Quick Action: Open Camera Scanner */}
            <TouchableOpacity
              style={styles.bigScanButton}
              onPress={() => {
                setPairingModalOpen(false);
                setScannerModalOpen(true);
              }}
              activeOpacity={0.85}
            >
              <QrCode size={20} color={colors.void} />
              <Text style={styles.bigScanButtonText}>INQUADRA QR CODE CON LA FOTOCAMERA</Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OPPURE INSERIMENTO MANUALE</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>URL del Sito Web o GM Screen:</Text>
              <TextInput
                style={styles.formInput}
                value={baseUrl}
                onChangeText={setBaseUrl}
                placeholder="https://www.barberanddragons.com"
                placeholderTextColor={colors.parchmentMuted}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Session Public ID o Link QR Completo:</Text>
              <TextInput
                style={styles.formInput}
                value={sessionPublicId}
                onChangeText={setSessionPublicId}
                placeholder="Es. 8f420e10-3942-4913-9114-61cbf5727b11"
                placeholderTextColor={colors.parchmentMuted}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Token di Sessione (#t=...):</Text>
              <TextInput
                style={styles.formInput}
                value={remoteToken}
                onChangeText={setRemoteToken}
                placeholder="Incolla segreto token pairing"
                placeholderTextColor={colors.parchmentMuted}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            {/* Buttons */}
            <View style={styles.modalButtons}>
              {isConnected && (
                <TouchableOpacity
                  style={styles.disconnectBtn}
                  onPress={disconnectSession}
                  activeOpacity={0.8}
                >
                  <Unlink size={15} color={colors.crimsonLight} />
                  <Text style={styles.disconnectBtnText}>Disconnetti</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.connectBtn}
                onPress={handleSaveManualPairing}
                activeOpacity={0.85}
              >
                <Check size={16} color={colors.void} />
                <Text style={styles.connectBtnText}>Salva e Connetti</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
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
  pairingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.stoneSurface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.stoneBorder,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  pairingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  pairingStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotConnected: {
    backgroundColor: colors.emerald,
  },
  dotDisconnected: {
    backgroundColor: colors.crimsonLight,
  },
  pairingTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.parchmentLight,
    letterSpacing: 0.8,
  },
  pairingSub: {
    fontSize: 9,
    color: colors.parchmentMuted,
    marginTop: 2,
  },
  pairingBannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scanQrBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.brassBase,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 7,
  },
  scanQrBannerBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.void,
    letterSpacing: 0.4,
  },
  pairingActionBtn: {
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.brassDark,
    padding: 7,
    borderRadius: 7,
  },
  masterDeck: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.brassDark,
    padding: 16,
    marginBottom: 20,
  },
  masterDeckHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  deckTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.brassLight,
    letterSpacing: 0.8,
  },
  nowPlayingSubtitle: {
    fontSize: 10,
    color: colors.parchmentMuted,
    marginTop: 2,
  },
  nowPlayingHighlight: {
    color: colors.emerald,
    fontWeight: '700',
  },
  transmissionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.stone,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    maxWidth: '50%',
  },
  transmissionText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.parchmentMuted,
  },
  transportRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginBottom: 18,
  },
  transportBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigPlayBtn: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: colors.brassBase,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  bigPlayBtnPlaying: {
    backgroundColor: colors.emerald,
  },
  stopAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: colors.crimson,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 6,
  },
  stopAllText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.crimsonLight,
  },
  volumeConsole: {
    borderTopWidth: 1,
    borderTopColor: colors.stoneBorder,
    paddingTop: 12,
  },
  volumeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  muteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  volumeValueText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  volStepRow: {
    flexDirection: 'row',
    gap: 6,
  },
  volStepBtn: {
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  volStepBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.parchmentLight,
  },
  presetChipsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  presetVolChip: {
    flex: 1,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  presetVolChipActive: {
    backgroundColor: colors.brassBase,
    borderColor: colors.brassLight,
  },
  presetVolText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.parchmentMuted,
  },
  presetVolTextActive: {
    color: colors.void,
    fontWeight: '800',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: colors.parchmentMuted,
    flex: 1,
  },
  sfxGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  sfxPadCard: {
    width: '31%',
    backgroundColor: colors.stoneSurface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 10,
    minHeight: 82,
    justifyContent: 'space-between',
  },
  sfxPadCardActive: {
    backgroundColor: colors.brassDark,
    borderColor: colors.brassLight,
    transform: [{ scale: 0.96 }],
  },
  sfxPadTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sfxIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.stone,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sfxSlotBadge: {
    fontSize: 7,
    fontWeight: '800',
    color: colors.parchmentMuted,
  },
  sfxPadLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.parchmentLight,
  },
  sfxPadSub: {
    fontSize: 9,
    color: colors.brassLight,
    marginTop: 1,
  },
  catalogSection: {
    marginBottom: 20,
  },
  catalogList: {
    gap: 8,
  },
  catalogTrackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.stoneSurface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 12,
  },
  catalogTrackCardActive: {
    borderColor: colors.emerald,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  catalogTrackLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  catalogTrackTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.parchmentLight,
  },
  catalogTrackTitleActive: {
    color: colors.emerald,
    fontWeight: '800',
  },
  catalogTrackMood: {
    fontSize: 10,
    color: colors.parchmentMuted,
    marginTop: 1,
  },
  catalogPlayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.brassBase,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  catalogPlayBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.void,
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
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.brassDark,
    padding: 18,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.brassLight,
    letterSpacing: 0.8,
  },
  modalDescription: {
    fontSize: 11,
    color: colors.parchmentMuted,
    lineHeight: 16,
    marginBottom: 14,
  },
  bigScanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.brassBase,
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 14,
  },
  bigScanButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.void,
    letterSpacing: 0.6,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.stoneBorder,
  },
  dividerText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.parchmentMuted,
    letterSpacing: 0.6,
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
    fontSize: 12,
    color: colors.parchmentLight,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  disconnectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: colors.crimson,
    paddingVertical: 12,
    borderRadius: 8,
  },
  disconnectBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.crimsonLight,
  },
  connectBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.brassBase,
    paddingVertical: 12,
    borderRadius: 8,
  },
  connectBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.void,
    letterSpacing: 0.5,
  },
});

export default GmAudioRemoteScreen;
