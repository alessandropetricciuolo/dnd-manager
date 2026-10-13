import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from 'react';
import { AppState } from 'react-native';
import { User } from '@supabase/supabase-js';
import { supabase } from '../api/supabase';
import { unregisterCurrentPushDevice } from '../notifications/deviceRegistration';
import { Profile, UserRole } from '../types';
import { prepareLoginCredentials, resolveTrustedProfileRole } from '../auth/access';

export interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  role: UserRole | null;
  activeMode: 'player' | 'gm';
  switchMode: (mode: 'player' | 'gm') => void;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<{ error?: string }>;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeMode, setActiveMode] = useState<'player' | 'gm'>('player');
  const [loading, setLoading] = useState<boolean>(true);
  const currentUserId = useRef<string | null>(null);

  // Authorization comes only from the trusted profiles row. Missing or invalid
  // profile data leaves the account without an app role.
  const role = resolveTrustedProfileRole(profile?.role);

  const loadProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const trustedRole = resolveTrustedProfileRole(data?.role);
      if (error || !data || !trustedRole) {
        console.warn('[AuthContext] Profilo non disponibile o ruolo non valido:', error?.message);
        return null;
      }

      const computedName =
        data.display_name ||
        [data.first_name, data.last_name].filter(Boolean).join(' ') ||
        data.nickname ||
        data.username ||
        (trustedRole === 'admin' ? 'Master Stegosandro' : 'Avventuriero');
      return { ...data, role: trustedRole, display_name: computedName } as Profile;
    } catch (err) {
      console.warn('[AuthContext] Eccezione caricamento profilo:', err);
      return null;
    }
  }, []);

  const syncActiveMode = useCallback((userRole: UserRole | null) => {
    setActiveMode(userRole === 'gm' || userRole === 'admin' ? 'gm' : 'player');
  }, []);

  const refreshProfile = useCallback(async () => {
    const currentUser = user;
    if (!currentUser) {
      setProfile(null);
      syncActiveMode(null);
      return;
    }
    if (!profile?.role) setLoading(true);
    const prof = await loadProfile(currentUser.id);
    if (currentUserId.current !== currentUser.id) return;
    setProfile(prof);
    if (prof?.role !== profile?.role) syncActiveMode(prof?.role ?? null);
    setLoading(false);
  }, [user, profile?.role, loadProfile, syncActiveMode]);

  // Auth callbacks only update React state. Profile I/O happens in the effect
  // below, outside Supabase's auth event lock.
  useEffect(() => {
    let isMounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      const nextUser = session?.user ?? null;
      const nextUserId = nextUser?.id ?? null;
      const identityChanged = currentUserId.current !== nextUserId;
      currentUserId.current = nextUserId;
      setUser(nextUser);
      if (identityChanged) {
        setProfile(null);
        setActiveMode('player');
        setLoading(Boolean(nextUser));
      }
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return;
      if (error) console.warn('[AuthContext] Errore getSession:', error.message);
      currentUserId.current = data.session?.user?.id ?? null;
      setUser(data.session?.user ?? null);
      if (!data.session?.user) setLoading(false);
    }).catch((err) => {
      if (!isMounted) return;
      console.warn('[AuthContext] Inizializzazione fallita:', err);
      setUser(null);
      setProfile(null);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;
    if (!user) {
      setProfile(null);
      setActiveMode('player');
      setLoading(false);
      return () => { isCurrent = false; };
    }

    setLoading(true);
    void loadProfile(user.id).then((prof) => {
      if (!isCurrent || currentUserId.current !== user.id) return;
      setProfile(prof);
      syncActiveMode(prof?.role ?? null);
      setLoading(false);
    });
    return () => { isCurrent = false; };
  }, [user?.id, loadProfile, syncActiveMode]);

  // Resume token refresh and reload trusted authorization data after the app
  // returns from the background.
  useEffect(() => {
    if (AppState.currentState === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
    let previousState: typeof AppState.currentState = AppState.currentState;
    const subscription = AppState.addEventListener('change', (nextState: typeof AppState.currentState) => {
      if (nextState === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
      if (previousState.match(/inactive|background/) && nextState === 'active') {
        void refreshProfile();
      }
      previousState = nextState;
    });
    return () => { subscription.remove(); supabase.auth.stopAutoRefresh(); };
  }, [refreshProfile]);

  const switchMode = useCallback((mode: 'player' | 'gm') => {
    if (role === 'admin') setActiveMode(mode);
    else setActiveMode(role === 'gm' ? 'gm' : 'player');
  }, [role]);

  const signIn = useCallback(async (email: string, password: string): Promise<{ error?: string }> => {
    const credentials = prepareLoginCredentials(email, password);
    if ('error' in credentials) return { error: credentials.error };

    try {
      const { error } = await supabase.auth.signInWithPassword(credentials);
      if (!error) return {};
      console.warn('[AuthContext] signInWithPassword error:', error.message);
      let userMessage = 'Email o password non corretti. Controlla le tue credenziali.';
      if (error.message.includes('Invalid login credentials')) {
        userMessage = 'Email o password non corretti. Verifica le tue credenziali del sito.';
      } else if (error.message.includes('Email not confirmed')) {
        userMessage = 'Email non ancora confermata. Controlla la tua posta elettronica.';
      } else if (error.status === 429 || error.message.includes('rate limit')) {
        userMessage = 'Troppi tentativi falliti. Riprova tra qualche minuto.';
      } else if (error.message.includes('fetch failed') || error.message.includes('Network request failed')) {
        userMessage = 'Impossibile contattare il server. Verifica la tua connessione internet.';
      }
      return { error: userMessage };
    } catch (err: any) {
      console.error('[AuthContext] signIn exception:', err);
      return { error: err?.message || 'Errore di connessione durante l’accesso.' };
    }
  }, []);

  const signOut = useCallback(async (): Promise<{ error?: string }> => {
    try {
      await unregisterCurrentPushDevice();
    } catch (err) {
      console.warn('[AuthContext] Disregistrazione push fallita:', err);
      return { error: 'Non è stato possibile disattivare le notifiche su questo dispositivo. Riprova prima di uscire.' };
    }
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.warn('[AuthContext] Errore disconnessione:', error.message);
      return { error: 'Non è stato possibile chiudere la sessione. Riprova.' };
    }
    setUser(null);
    setProfile(null);
    setActiveMode('player');
    return {};
  }, []);

  const value = useMemo<AuthContextType>(() => ({
    user, profile, role, activeMode, switchMode, signIn, signOut, loading, refreshProfile,
  }), [user, profile, role, activeMode, switchMode, signIn, signOut, loading, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve essere usato all’interno di AuthProvider');
  return context;
};

export default AuthContext;
