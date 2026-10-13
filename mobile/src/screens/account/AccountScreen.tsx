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
import { Mail, Shield, Trash2, Bell } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { usePushNotifications } from '../../contexts/PushNotificationsContext';
import { supabase } from '../../api/supabase';
import { listBlockedWhisperUsers, unblockWhisperUser } from '../../api/whisperSafety';
import { colors } from '../../theme/colors';

const SITE = 'https://barberanddragons.com';

export const AccountScreen: React.FC = () => {
  const { user, profile, signOut } = useAuth();
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
      <View style={styles.heading}>
        <View style={styles.iconBadge}><Shield size={22} color={colors.brassLight} /></View>
        <Text style={styles.title}>Account e privacy</Text>
        <Text style={styles.subtitle}>Gestisci notifiche, supporto e i tuoi dati.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Il tuo account</Text>
        <Text style={styles.name}>{profile?.display_name || profile?.nickname || 'Avventuriero'}</Text>
        <Text style={styles.email}>{user?.email || 'Email non disponibile'}</Text>
        <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL(`${SITE}/profile`)} accessibilityRole="link">
          <Text style={styles.linkText}>Modifica i dati del profilo sul sito</Text>
          <Mail size={16} color={colors.brassLight} />
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeadingRow}>
          <Bell size={18} color={colors.brassLight} />
          <Text style={styles.sectionTitle}>Notifiche</Text>
        </View>
        <View style={styles.preferenceRow}>
          <View style={styles.preferenceCopy}>
            <Text style={styles.preferenceTitle}>Notifiche push</Text>
            <Text style={styles.preferenceDescription}>Attiva o disattiva gli avvisi su questo dispositivo.</Text>
          </View>
          {pushLoading ? <ActivityIndicator color={colors.brassLight} /> : (
            <Switch value={enabled} disabled={pushLoading} onValueChange={togglePush} trackColor={{ true: colors.brassDark }} />
          )}
        </View>
        {enabled && <>
          <View style={styles.preferenceRow}>
            <Text style={styles.preferenceTitle}>Nuovi sussurri</Text>
            <Switch value={preferences.whispers ?? whispers} disabled={pushLoading} onValueChange={(value: boolean) => { void togglePreference('whispers', value); }} trackColor={{ true: colors.brassDark }} />
          </View>
          <View style={styles.preferenceRow}>
            <Text style={styles.preferenceTitle}>Aggiornamenti sessioni</Text>
            <Switch value={preferences.sessions ?? sessions} disabled={pushLoading} onValueChange={(value: boolean) => { void togglePreference('sessions', value); }} trackColor={{ true: colors.brassDark }} />
          </View>
        </>}
        {pushError ? <Text accessibilityRole="alert" style={styles.errorText}>{pushError}</Text> : null}
        {profile?.notifications_disabled ? <Text style={styles.bodyText}>Gli avvisi generali del tuo account sono disattivati sul sito. Riattivali nelle preferenze del profilo per ricevere le push.</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Aiuto e privacy</Text>
        <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL(`${SITE}/privacy`)} accessibilityRole="link">
          <Text style={styles.linkText}>Informativa privacy</Text><Shield size={16} color={colors.brassLight} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL(`${SITE}/support`)} accessibilityRole="link">
          <Text style={styles.linkText}>Contatta il supporto</Text><Mail size={16} color={colors.brassLight} />
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Account bloccati nei sussurri</Text>
        {blocksError ? <Text accessibilityRole="alert" style={styles.errorText}>{blocksError}</Text> : null}
        {!blocksError && blockedUsers.length === 0 ? <Text style={styles.bodyText}>Non hai account bloccati.</Text> : null}
        {blockedUsers.map((item) => (
          <View key={item.blocked_id} style={styles.blockRow}>
            <Text style={styles.blockLabel}>ID • {item.blocked_id.slice(0, 8)}</Text>
            <TouchableOpacity onPress={() => removeBlock(item.blocked_id)} accessibilityRole="button">
              <Text style={styles.unblockText}>Rimuovi</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <View style={[styles.card, styles.dangerCard]}>
        <Text style={styles.sectionTitle}>Eliminazione account</Text>
        <Text style={styles.bodyText}>Puoi inviare una richiesta di cancellazione. Il team la gestirà manualmente; questa azione non elimina subito l’account.</Text>
        <TouchableOpacity style={styles.deleteButton} onPress={confirmDeletion} disabled={deletionBusy} accessibilityRole="button">
          {deletionBusy ? <ActivityIndicator color={colors.parchmentLight} /> : <Trash2 size={17} color={colors.parchmentLight} />}
          <Text style={styles.deleteButtonText}>Richiedi la cancellazione</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL(`${SITE}/delete-account`)} accessibilityRole="link">
          <Text style={styles.linkText}>Leggi come viene gestita la richiesta</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={() => { void handleSignOut(); }} accessibilityRole="button">
        <Text style={styles.signOutText}>Esci dall’account</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.void },
  content: { padding: 18, paddingBottom: 40, gap: 14 },
  heading: { alignItems: 'center', paddingVertical: 12, marginBottom: 2 },
  iconBadge: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.stoneSurface, borderColor: colors.brassDark, borderWidth: 1, marginBottom: 10 },
  title: { color: colors.parchmentLight, fontSize: 22, fontWeight: '800' },
  subtitle: { color: colors.parchmentMuted, fontSize: 13, marginTop: 5, textAlign: 'center' },
  card: { backgroundColor: colors.stoneSurface, borderColor: colors.stoneBorder, borderWidth: 1, borderRadius: 12, padding: 16, gap: 12 },
  dangerCard: { borderColor: '#6F3034' },
  sectionTitle: { color: colors.brassLight, fontSize: 15, fontWeight: '800' },
  sectionHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { color: colors.parchmentLight, fontSize: 18, fontWeight: '700' },
  email: { color: colors.parchmentMuted, fontSize: 14 },
  linkRow: { minHeight: 42, borderTopWidth: 1, borderTopColor: colors.stoneBorder, paddingTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  linkText: { color: colors.brassLight, fontSize: 13, textDecorationLine: 'underline', flexShrink: 1 },
  preferenceRow: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, borderTopWidth: 1, borderTopColor: colors.stoneBorder, paddingTop: 8 },
  preferenceCopy: { flex: 1 },
  preferenceTitle: { color: colors.parchmentLight, fontSize: 14, fontWeight: '600' },
  preferenceDescription: { color: colors.parchmentMuted, fontSize: 12, marginTop: 3 },
  errorText: { color: colors.crimsonLight, fontSize: 12 },
  blockRow: { minHeight: 42, borderTopWidth: 1, borderTopColor: colors.stoneBorder, paddingTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  blockLabel: { color: colors.parchmentLight, fontSize: 13 },
  unblockText: { color: colors.brassLight, fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },
  bodyText: { color: colors.parchmentMuted, fontSize: 13, lineHeight: 19 },
  deleteButton: { minHeight: 46, backgroundColor: '#6F3034', borderRadius: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  deleteButtonText: { color: colors.parchmentLight, fontWeight: '800', fontSize: 13 },
  signOutButton: { paddingVertical: 14, alignItems: 'center' },
  signOutText: { color: colors.parchmentMuted, fontWeight: '700', textDecorationLine: 'underline' },
});

export default AccountScreen;
