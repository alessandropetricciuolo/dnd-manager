import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Mail,
  Shield,
  Trash2,
  Bell,
  Crown,
  Award,
  Repeat,
  ChevronRight,
  LogOut,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { usePushNotifications } from '../../contexts/PushNotificationsContext';
import { supabase } from '../../api/supabase';
import { listBlockedWhisperUsers, unblockWhisperUser } from '../../api/whisperSafety';
import { colors } from '../../theme/colors';

const SITE = 'https://barberanddragons.com';

export const AccountScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, profile, role, activeMode, switchMode, signOut } = useAuth();
  const isGmOrAdmin = role === 'gm' || role === 'admin';
  const isAdmin = role === 'admin';

  const {
    enabled,
    whispers,
    sessions,
    preferences,
    enableNotifications,
    updatePreferences,
    disableNotifications,
    error: pushError,
    loading: pushLoading,
  } = usePushNotifications();
  const [deletionBusy, setDeletionBusy] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<Array<{ blocked_id: string; created_at: string }>>([]);
  const [blocksError, setBlocksError] = useState<string | null>(null);

  const refreshBlockedUsers = useCallback(async () => {
    if (!user?.id) return;
    try {
      setBlockedUsers(await listBlockedWhisperUsers(user.id));
      setBlocksError(null);
    } catch {
      setBlocksError('Non siamo riusciti a caricare i blocchi. Riprova tra poco.');
    }
  }, [user?.id]);

  useEffect(() => { void refreshBlockedUsers(); }, [refreshBlockedUsers]);

  const removeBlock = (blockedId: string) => Alert.alert(
    'Rimuovere il blocco?',
    'Potrai inviare e ricevere nuovi sussurri da questo account.',
    [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Rimuovi blocco', onPress: () => {
        if (!user?.id) return;
        void unblockWhisperUser(user.id, blockedId).then(refreshBlockedUsers)
          .catch(() => setBlocksError('Non siamo riusciti a rimuovere il blocco. Riprova.'));
      } },
    ],
  );

  const requestDeletion = async () => {
    setDeletionBusy(true);
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session?.access_token) throw new Error('Sessione non disponibile');
      const response = await fetch(`${SITE}/api/mobile/account-deletion`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error('Richiesta non inviata');
      Alert.alert(
        'Richiesta registrata',
        'Il team prenderà in carico la richiesta manualmente. L’invio non cancella subito l’account; riceverai un aggiornamento all’indirizzo associato.'
      );
    } catch {
      Alert.alert('Invio non riuscito', 'Non siamo riusciti a inviare la richiesta. Riprova o contatta il supporto.');
    } finally {
      setDeletionBusy(false);
    }
  };

  const confirmDeletion = () => Alert.alert(
    'Richiedere la cancellazione?',
    'Invieremo una richiesta al team per la gestione manuale. L’account non verrà eliminato automaticamente.',
    [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Invia richiesta', style: 'destructive', onPress: () => { void requestDeletion(); } },
    ],
  );

  const togglePush = async (value: boolean) => {
    try {
      if (value) await enableNotifications();
      else await disableNotifications();
    } catch {
      Alert.alert('Notifiche non aggiornate', pushError || 'Riprova tra poco.');
    }
  };

  const togglePreference = async (key: 'whispers' | 'sessions', value: boolean) => {
    try {
      await updatePreferences({ [key]: value });
    } catch {
      Alert.alert('Preferenza non aggiornata', pushError || 'Riprova tra poco.');
    }
  };

  const handleSignOut = async () => {
    const result = await signOut();
    if (result.error) Alert.alert('Impossibile uscire', result.error);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* HEADING ARALDICO */}
      <View style={styles.heading}>
        <View style={styles.iconBadge}>
          {isGmOrAdmin ? (
            <Crown size={24} color={colors.brassLight} />
          ) : (
            <Shield size={24} color={colors.brassLight} />
          )}
        </View>
        <Text style={styles.title}>
          {isGmOrAdmin ? 'Profilo Game Master' : 'Profilo Giocatore'}
        </Text>
        <Text style={styles.subtitle}>
          {isGmOrAdmin
            ? 'Gestione identità Master, presenze di gilda e impostazioni.'
            : 'Passaporto dell’Avventuriero, preferenze e dati personali.'}
        </Text>
      </View>

      {/* SCHEDA UTENTE & STATISTICHE */}
      <View style={styles.card}>
        <View style={styles.profileHeaderRow}>
          <View>
            <Text style={styles.name}>
              {profile?.display_name || profile?.nickname || 'Avventuriero'}
            </Text>
            <Text style={styles.email}>{user?.email || 'Email non disponibile'}</Text>
          </View>
          <View style={styles.roleBadgePill}>
            <Text style={styles.roleBadgePillText}>
              {role === 'admin' ? 'ADMIN' : role === 'gm' ? 'MASTER' : 'PLAYER'}
            </Text>
          </View>
        </View>

        {/* Statistiche di Gilda */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{profile?.fame_score ?? 10}</Text>
            <Text style={styles.statLabel}>Punti Fama</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{profile?.sessions_attended_count ?? 1}</Text>
            <Text style={styles.statLabel}>Sessioni Giocate</Text>
          </View>
        </View>

        {/* Switcher Admin tra GM e Player */}
        {isAdmin && (
          <TouchableOpacity
            style={styles.adminSwitchBtn}
            onPress={() => switchMode(activeMode === 'gm' ? 'player' : 'gm')}
            activeOpacity={0.8}
          >
            <Repeat size={14} color={colors.void} />
            <Text style={styles.adminSwitchBtnText}>
              Passa a vista {activeMode === 'gm' ? 'Giocatore' : 'Regia GM'}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => Linking.openURL(`${SITE}/profile`)}
          accessibilityRole="link"
        >
          <Text style={styles.linkText}>Modifica i dati del profilo sul sito web</Text>
          <Mail size={16} color={colors.brassLight} />
        </TouchableOpacity>
      </View>

      {/* STRUMENTI GM (PRESENZE & XP) */}
      {isGmOrAdmin && (
        <View style={styles.card}>
          <View style={styles.sectionHeadingRow}>
            <Award size={18} color={colors.brassLight} />
            <Text style={styles.sectionTitle}>Strumenti Direzione Tavoli</Text>
          </View>

          <TouchableOpacity
            style={styles.toolActionRow}
            onPress={() => {
              try {
                navigation.navigate('GmXpAttendance');
              } catch {
                Alert.alert('Registro', 'Apri la schermata dal menu di navigazione.');
              }
            }}
            activeOpacity={0.8}
          >
            <View style={styles.toolActionLeft}>
              <Award size={18} color={colors.brassBase} />
              <View>
                <Text style={styles.toolActionTitle}>Registro Presenze & Assegnazione XP</Text>
                <Text style={styles.toolActionSubtitle}>
                  Verifica i partecipanti e distribuisci l’esperienza di fine giocata
                </Text>
              </View>
            </View>
            <ChevronRight size={16} color={colors.brassLight} />
          </TouchableOpacity>
        </View>
      )}

      {/* NOTIFICHE */}
      <View style={styles.card}>
        <View style={styles.sectionHeadingRow}>
          <Bell size={18} color={colors.brassLight} />
          <Text style={styles.sectionTitle}>Notifiche Push</Text>
        </View>
        <View style={styles.preferenceRow}>
          <View style={styles.preferenceCopy}>
            <Text style={styles.preferenceTitle}>Notifiche push su dispositivo</Text>
            <Text style={styles.preferenceDescription}>Attiva o disattiva gli avvisi sul telefono.</Text>
          </View>
          {pushLoading ? (
            <ActivityIndicator color={colors.brassLight} />
          ) : (
            <Switch
              value={enabled}
              disabled={pushLoading}
              onValueChange={togglePush}
              trackColor={{ true: colors.brassDark, false: colors.stoneBorder }}
            />
          )}
        </View>
        {enabled && (
          <>
            <View style={styles.preferenceRow}>
              <Text style={styles.preferenceTitle}>Nuovi sussurri segreti</Text>
              <Switch
                value={preferences.whispers ?? whispers}
                disabled={pushLoading}
                onValueChange={(value: boolean) => { void togglePreference('whispers', value); }}
                trackColor={{ true: colors.brassDark, false: colors.stoneBorder }}
              />
            </View>
            <View style={styles.preferenceRow}>
              <Text style={styles.preferenceTitle}>Aggiornamenti convocazioni sessioni</Text>
              <Switch
                value={preferences.sessions ?? sessions}
                disabled={pushLoading}
                onValueChange={(value: boolean) => { void togglePreference('sessions', value); }}
                trackColor={{ true: colors.brassDark, false: colors.stoneBorder }}
              />
            </View>
          </>
        )}
        {pushError ? <Text accessibilityRole="alert" style={styles.errorText}>{pushError}</Text> : null}
        {profile?.notifications_disabled ? (
          <Text style={styles.bodyText}>
            Gli avvisi generali del tuo account sono disattivati sul sito. Riattivali nelle preferenze per ricevere le push.
          </Text>
        ) : null}
      </View>

      {/* AIUTO & ASSISTENZA */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Aiuto e Condizioni</Text>
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => Linking.openURL(`${SITE}/privacy`)}
          accessibilityRole="link"
        >
          <Text style={styles.linkText}>Informativa privacy</Text>
          <Shield size={16} color={colors.brassLight} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => Linking.openURL(`${SITE}/support`)}
          accessibilityRole="link"
        >
          <Text style={styles.linkText}>Contatta il supporto di Gilda</Text>
          <Mail size={16} color={colors.brassLight} />
        </TouchableOpacity>
      </View>

      {/* BLOCCHI SUSSURRI */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Account bloccati nei sussurri</Text>
        {blocksError ? <Text accessibilityRole="alert" style={styles.errorText}>{blocksError}</Text> : null}
        {!blocksError && blockedUsers.length === 0 ? (
          <Text style={styles.bodyText}>Non hai account bloccati.</Text>
        ) : null}
        {blockedUsers.map((item) => (
          <View key={item.blocked_id} style={styles.blockRow}>
            <Text style={styles.blockLabel}>ID · {item.blocked_id.slice(0, 8)}</Text>
            <TouchableOpacity onPress={() => removeBlock(item.blocked_id)} accessibilityRole="button">
              <Text style={styles.unblockText}>Rimuovi blocco</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* DANGER ZONE - ELIMINAZIONE */}
      <View style={[styles.card, styles.dangerCard]}>
        <Text style={styles.sectionTitle}>Eliminazione Account</Text>
        <Text style={styles.bodyText}>
          Puoi inviare una richiesta di cancellazione. Il team la gestirà manualmente; questa azione non elimina subito l’account.
        </Text>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={confirmDeletion}
          disabled={deletionBusy}
          accessibilityRole="button"
        >
          {deletionBusy ? (
            <ActivityIndicator color={colors.parchmentLight} />
          ) : (
            <Trash2 size={16} color={colors.parchmentLight} />
          )}
          <Text style={styles.deleteButtonText}>Richiedi la cancellazione</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => Linking.openURL(`${SITE}/delete-account`)}
          accessibilityRole="link"
        >
          <Text style={styles.linkText}>Leggi come viene gestita la richiesta</Text>
        </TouchableOpacity>
      </View>

      {/* SIGNOUT BUTTON */}
      <TouchableOpacity
        style={styles.signOutButton}
        onPress={() => { void handleSignOut(); }}
        accessibilityRole="button"
      >
        <LogOut size={16} color={colors.crimsonLight} />
        <Text style={styles.signOutText}>Esci dall’account</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.void },
  content: { padding: 18, paddingBottom: 50, gap: 14 },
  heading: { alignItems: 'center', paddingVertical: 12, marginBottom: 2 },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.stoneSurface,
    borderColor: colors.brassDark,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  title: { color: colors.parchmentLight, fontSize: 22, fontWeight: '800' },
  subtitle: { color: colors.parchmentMuted, fontSize: 13, marginTop: 4, textAlign: 'center' },
  card: {
    backgroundColor: colors.stoneSurface,
    borderColor: colors.stoneBorder,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  dangerCard: { borderColor: '#6F3034' },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  sectionTitle: { color: colors.brassLight, fontSize: 15, fontWeight: '800' },
  sectionHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { color: colors.parchmentLight, fontSize: 19, fontWeight: '800' },
  email: { color: colors.parchmentMuted, fontSize: 13, marginTop: 2 },
  roleBadgePill: {
    backgroundColor: 'rgba(197, 155, 39, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.brassBase,
  },
  roleBadgePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.brassLight,
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.stone,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingVertical: 10,
    marginTop: 4,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statVal: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.parchmentMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.stoneBorder,
  },
  adminSwitchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.brassBase,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 2,
  },
  adminSwitchBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.void,
  },
  toolActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.stone,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
  },
  toolActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  toolActionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  toolActionSubtitle: {
    fontSize: 11,
    color: colors.parchmentMuted,
    marginTop: 2,
  },
  linkRow: {
    minHeight: 40,
    borderTopWidth: 1,
    borderTopColor: colors.stoneBorder,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  linkText: { color: colors.brassLight, fontSize: 13, textDecorationLine: 'underline', flexShrink: 1 },
  preferenceRow: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    borderTopWidth: 1,
    borderTopColor: colors.stoneBorder,
    paddingTop: 8,
  },
  preferenceCopy: { flex: 1 },
  preferenceTitle: { color: colors.parchmentLight, fontSize: 14, fontWeight: '600' },
  preferenceDescription: { color: colors.parchmentMuted, fontSize: 12, marginTop: 3 },
  errorText: { color: colors.crimsonLight, fontSize: 12 },
  blockRow: {
    minHeight: 40,
    borderTopWidth: 1,
    borderTopColor: colors.stoneBorder,
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  blockLabel: { color: colors.parchmentLight, fontSize: 13 },
  unblockText: { color: colors.brassLight, fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },
  bodyText: { color: colors.parchmentMuted, fontSize: 13, lineHeight: 19 },
  deleteButton: {
    minHeight: 44,
    backgroundColor: '#6F3034',
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deleteButtonText: { color: colors.parchmentLight, fontWeight: '800', fontSize: 13 },
  signOutButton: {
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  signOutText: { color: colors.crimsonLight, fontWeight: '700' },
});

export default AccountScreen;
