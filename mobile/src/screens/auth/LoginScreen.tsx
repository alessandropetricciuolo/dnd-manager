import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { AppleAuthenticationButton, AppleAuthenticationButtonStyle, AppleAuthenticationButtonType } from 'expo-apple-authentication';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Shield,
  AlertCircle,
  KeyRound,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useAuth } from '../../contexts/AuthContext';
import { requestWebPasswordReset } from '../../api/supabase';
import { signInWithGoogle } from '../../auth/google';
import { signInWithApple, useAppleSignInAvailability } from '../../auth/apple';

export const LoginScreen: React.FC = () => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isSigningInWithGoogle, setIsSigningInWithGoogle] = useState(false);
  const [isSigningInWithApple, setIsSigningInWithApple] = useState(false);
  const appleAvailable = useAppleSignInAvailability();
  const googleAvailable = Platform.OS === 'android' || appleAvailable;
  const isBusy = isSubmitting || isResettingPassword || isSigningInWithGoogle || isSigningInWithApple;

  const handleAppleLogin = async () => {
    if (isBusy) return;
    setErrorMessage(null);
    setIsSigningInWithApple(true);
    try {
      const result = await signInWithApple();
      if (result.error) setErrorMessage(result.error);
    } finally {
      setIsSigningInWithApple(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (isBusy) return;
    setErrorMessage(null);
    setIsSigningInWithGoogle(true);
    try {
      const result = await signInWithGoogle();
      if (result.error) setErrorMessage(result.error);
    } finally {
      setIsSigningInWithGoogle(false);
    }
  };

  const handleLogin = async () => {
    if (isBusy) return;
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setErrorMessage('Inserisci la tua email.');
      return;
    }
    if (!password) {
      setErrorMessage('Inserisci la tua password.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const result = await signIn(trimmedEmail, password);
      if (result.error) {
        setErrorMessage(result.error);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Errore imprevisto durante l’accesso.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordReset = async () => {
    if (isBusy) return;
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('Inserisci prima la tua email, poi richiedi il recupero password.');
      return;
    }
    setIsResettingPassword(true);
    setErrorMessage(null);
    try {
      const { error } = await requestWebPasswordReset(trimmedEmail);
      if (error) throw error;
      Alert.alert('Controlla la tua email', 'Se l’indirizzo è registrato, riceverai un link per aggiornare la password.');
    } catch {
      setErrorMessage('Non siamo riusciti a inviare il link. Riprova tra poco o contatta il supporto.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior="padding"
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Guild Crest */}
          <View style={styles.header}>
            <View style={styles.crestBadge}>
              <Shield size={36} color={colors.brassLight} />
            </View>
            <Text style={styles.brandTitle}>BARBER & DRAGONS</Text>
            <Text style={styles.brandSubtitle}>TAVERN COMPANION & GUILD</Text>
          </View>

          {/* Login Card */}
          <View style={styles.loginCard}>
            <Text style={styles.cardTitle}>ACCEDI ALLA GILDA</Text>
            <Text style={styles.cardSubtitle}>
              Usa il tuo account Barber &amp; Dragons
            </Text>

            {/* Error Feedback */}
            {errorMessage ? (
              <View
                style={styles.errorBox}
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
              >
                <AlertCircle size={18} color="#FCA5A5" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMAIL</Text>
              <View style={styles.inputContainer}>
                <Mail size={18} color={colors.brassBase} style={styles.inputIcon} />
                <TextInput
                  style={styles.inputField}
                  placeholder="nome@dominio.it"
                  placeholderTextColor={colors.parchmentMuted}
                  value={email}
                  onChangeText={(val: string) => {
                    setEmail(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  editable={!isBusy}
                  accessibilityLabel="Indirizzo email"
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PASSWORD</Text>
              <View style={styles.inputContainer}>
                <Lock size={18} color={colors.brassBase} style={styles.inputIcon} />
                <TextInput
                  style={styles.inputField}
                  placeholder="La tua password"
                  placeholderTextColor={colors.parchmentMuted}
                  value={password}
                  onChangeText={(val: string) => {
                    setPassword(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                  editable={!isBusy}
                  accessibilityLabel="Password"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((prev) => !prev)}
                  style={styles.eyeButton}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Nascondi password' : 'Mostra password'}
                >
                  {showPassword ? (
                    <EyeOff size={18} color={colors.parchmentMuted} />
                  ) : (
                    <Eye size={18} color={colors.parchmentMuted} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, isBusy && styles.submitButtonDisabled]}
              onPress={handleLogin}
              disabled={isBusy}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Accedi alla gilda"
            >
              {isSubmitting ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={colors.void} size="small" />
                  <Text style={styles.submitButtonText}>VERIFICA CREDENZIALI...</Text>
                </View>
              ) : (
                <View style={styles.submitContent}>
                  <KeyRound size={18} color={colors.void} />
                  <Text style={styles.submitButtonText}>ACCEDI</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={handlePasswordReset}
              disabled={isBusy}
              accessibilityRole="button"
            >
              <Text style={styles.forgotPasswordText}>
                {isResettingPassword ? 'INVIO DEL LINK…' : 'HAI DIMENTICATO LA PASSWORD?'}
              </Text>
            </TouchableOpacity>

            {googleAvailable && (
              <View style={styles.socialLogin}>
                <TouchableOpacity
                  style={[styles.socialButton, isBusy && styles.socialButtonDisabled]}
                  onPress={handleGoogleLogin}
                  disabled={isBusy}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isBusy, busy: isSigningInWithGoogle }}
                >
                  {isSigningInWithGoogle ? <ActivityIndicator size="small" color={colors.brassLight} /> : null}
                  <Text style={styles.socialButtonText}>
                    {isSigningInWithGoogle ? 'Apertura di Google…' : 'Accedi con Google'}
                  </Text>
                </TouchableOpacity>
                {appleAvailable && (
                  <View pointerEvents={isBusy ? 'none' : 'auto'} style={isBusy && styles.socialButtonDisabled}>
                    <AppleAuthenticationButton
                      buttonType={AppleAuthenticationButtonType.SIGN_IN}
                      buttonStyle={AppleAuthenticationButtonStyle.WHITE}
                      cornerRadius={10}
                      style={styles.appleButton}
                      onPress={handleAppleLogin}
                    />
                  </View>
                )}
                <Text style={styles.socialHint}>
                  {appleAvailable
                    ? 'Puoi collegare Apple da Account dopo aver effettuato l’accesso con la tua email.'
                    : 'Usa lo stesso indirizzo email del tuo account Barber & Dragons.'}
                </Text>
              </View>
            )}

            {__DEV__ && (
              <View style={{ marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(212,175,55,0.15)', width: '100%', gap: 8 }}>
                <Text style={{ color: colors.parchmentMuted, fontSize: 11, textAlign: 'center', letterSpacing: 0.5, fontWeight: '600' }}>
                  MODALITÀ SVILUPPO LOCALE
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: 'rgba(59,130,246,0.15)', borderWidth: 1, borderColor: '#3b82f6', borderRadius: 8, paddingVertical: 9, alignItems: 'center' }}
                    onPress={() => signIn('player@demo.com', 'demo1234')}
                    disabled={isBusy}
                  >
                    <Text style={{ color: '#60a5fa', fontSize: 12, fontWeight: '700' }}>🛡️ Giocatore Demo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: 'rgba(217,119,6,0.15)', borderWidth: 1, borderColor: '#d97706', borderRadius: 8, paddingVertical: 9, alignItems: 'center' }}
                    onPress={() => signIn('gm@demo.com', 'demo1234')}
                    disabled={isBusy}
                  >
                    <Text style={{ color: '#fbbf24', fontSize: 12, fontWeight: '700' }}>👑 Master Demo</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Footer Info */}
          <Text style={styles.footerNote}>
            Utilizza le stesse credenziali con cui accedi al portale web di Barber &amp; Dragons.
          </Text>
          <View style={styles.legalLinks}>
            <Text onPress={() => Linking.openURL('https://barberanddragons.com/privacy')} style={styles.legalLink}>Privacy</Text>
            <Text style={styles.legalSeparator}>•</Text>
            <Text onPress={() => Linking.openURL('https://barberanddragons.com/support')} style={styles.legalLink}>Supporto</Text>
            <Text style={styles.legalSeparator}>•</Text>
            <Text onPress={() => Linking.openURL('https://barberanddragons.com/delete-account')} style={styles.legalLink}>Elimina account</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.void,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  crestBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.stoneSurface,
    borderWidth: 1.5,
    borderColor: colors.brassBase,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: colors.brassBase,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 2,
    color: colors.parchmentLight,
    textAlign: 'center',
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: colors.brassLight,
    marginTop: 4,
    textAlign: 'center',
  },
  loginCard: {
    width: '100%',
    backgroundColor: colors.stoneSurface,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: colors.stoneBorder,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.parchmentLight,
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.parchmentMuted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 18,
    lineHeight: 17,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(153, 27, 27, 0.25)',
    borderWidth: 1,
    borderColor: colors.crimson,
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12,
    color: '#FCA5A5',
    fontWeight: '600',
    flex: 1,
    lineHeight: 17,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.parchmentMuted,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.stone,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  inputField: {
    flex: 1,
    fontSize: 14,
    color: colors.parchmentLight,
    paddingVertical: 8,
  },
  eyeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    backgroundColor: colors.brassBase,
    borderRadius: 8,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.brassLight,
    shadowColor: colors.brassDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitButtonText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: colors.void,
  },
  forgotPasswordButton: { alignItems: 'center', paddingVertical: 14 },
  forgotPasswordText: { color: colors.brassLight, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  socialLogin: { borderTopWidth: 1, borderTopColor: colors.stoneBorder, paddingTop: 14, gap: 8 },
  socialButton: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.stone,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
  },
  socialButtonDisabled: { opacity: 0.6 },
  socialButtonText: { color: colors.parchmentLight, fontSize: 14, fontWeight: '700' },
  appleButton: { width: '100%', height: 48 },
  socialHint: { color: colors.parchmentMuted, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  legalLinks: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14 },
  legalLink: { color: colors.parchmentMuted, fontSize: 12, textDecorationLine: 'underline' },
  legalSeparator: { color: colors.stoneBorder },
  footerNote: {
    fontSize: 11,
    color: colors.parchmentMuted,
    marginTop: 20,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});

export default LoginScreen;
