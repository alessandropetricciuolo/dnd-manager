import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppStateStatus } from 'react-native';
import type {
  ExpoSpeechRecognitionNativeEventMap,
  ExpoSpeechRecognitionOptions,
} from 'expo-speech-recognition';

type SpeechListener = { remove: () => void };
type SpeechModule = {
  ExpoSpeechRecognitionModule: {
    addListener<K extends keyof ExpoSpeechRecognitionNativeEventMap>(
      event: K,
      listener: (payload: ExpoSpeechRecognitionNativeEventMap[K]) => void,
    ): SpeechListener;
    requestPermissionsAsync: () => Promise<{ granted: boolean }>;
    isRecognitionAvailable: () => boolean;
    getDefaultRecognitionService: () => { packageName: string };
    getSpeechRecognitionServices: () => string[];
    start: (options: ExpoSpeechRecognitionOptions) => void;
    stop: () => void;
    abort: () => void;
  };
};

export type PushToTalkState = 'idle' | 'requesting' | 'starting' | 'listening' | 'stopping' | 'unavailable';

export function shouldCancelVoiceOnAppStateChange(state: PushToTalkState, appState: AppStateStatus): boolean {
  // The Android permission activity can temporarily put our activity in the background.
  // Do not invalidate its pending permission result; begin() rechecks foreground state.
  return appState !== 'active' && (state === 'starting' || state === 'listening' || state === 'stopping');
}

export function describeSpeechRecognitionError(event: ExpoSpeechRecognitionNativeEventMap['error']): string {
  const messages: Record<ExpoSpeechRecognitionNativeEventMap['error']['error'], string> = {
    'not-allowed': 'Permesso microfono negato. Abilitalo nelle impostazioni dell’app.',
    'service-not-allowed': 'Il servizio di riconoscimento vocale del telefono non è disponibile.',
    'language-not-supported': 'Il servizio vocale del telefono non supporta l’italiano.',
    'network': 'Il servizio vocale non riesce a collegarsi. Controlla la connessione del telefono.',
    'no-speech': 'Nessuna voce riconosciuta. Tieni premuto, attendi “In ascolto”, parla e poi rilascia.',
    'speech-timeout': 'Il servizio non ha rilevato voce. Tieni premuto mentre parli.',
    'busy': 'Il servizio vocale è occupato. Attendi un momento e riprova.',
    'audio-capture': 'Il telefono non riesce ad aprire il microfono. Verifica che non sia usato da un’altra app.',
    'interrupted': 'La dettatura è stata interrotta dal telefono.',
    'aborted': 'Dettatura annullata.',
    'bad-grammar': 'Il servizio vocale ha rifiutato la richiesta.',
    'client': 'Il servizio vocale ha interrotto la richiesta.',
    'unknown': 'Il servizio vocale ha restituito un errore non riconosciuto.',
  };
  const detail = [event.error, event.code !== undefined ? `codice ${event.code}` : '', event.message?.slice(0, 200)].filter(Boolean).join(' · ');
  return `${messages[event.error]} (${detail})`;
}

export function finalTranscriptFromResultEvent(event: ExpoSpeechRecognitionNativeEventMap['result']): string | null {
  if (!event.isFinal) return null;
  const transcript = event.results[0]?.transcript.trim();
  return transcript || null;
}

/** Lazy loading keeps older native builds and Expo Go usable for typed commands. */
export function usePushToTalk() {
  const [state, setState] = useState<PushToTalkState>('idle');
  const [transcript, setTranscript] = useState('');
  const [message, setMessage] = useState('');
  const heldRef = useRef(false);
  const mountedRef = useRef(true);
  const startedRef = useRef(false);
  const moduleRef = useRef<SpeechModule['ExpoSpeechRecognitionModule'] | null>(null);
  const listenersRef = useRef<SpeechListener[]>([]);
  const transcriptRef = useRef('');
  const stoppingRef = useRef(false);
  const stateRef = useRef<PushToTalkState>('idle');
  const generationRef = useRef(0);
  const appStateRef = useRef<AppStateStatus>('active');

  const changeState = useCallback((next: PushToTalkState) => {
    stateRef.current = next;
    if (mountedRef.current) setState(next);
  }, []);

  const updateTranscript = useCallback((value: string) => {
    transcriptRef.current = value;
    if (mountedRef.current) setTranscript(value);
  }, []);

  const clearListeners = useCallback(() => {
    listenersRef.current.forEach((listener) => listener.remove());
    listenersRef.current = [];
  }, []);

  const begin = useCallback(async () => {
    if (stateRef.current === 'requesting' || stateRef.current === 'starting' || stateRef.current === 'listening' || stateRef.current === 'stopping') return;
    const generation = ++generationRef.current;
    clearListeners();
    heldRef.current = true;
    stoppingRef.current = false;
    updateTranscript('');
    setMessage('');
    changeState('requesting');
    try {
      const imported = await import('expo-speech-recognition') as unknown as SpeechModule;
      const speech = imported.ExpoSpeechRecognitionModule;
      moduleRef.current = speech;
      const permission = await speech.requestPermissionsAsync();
      if (generation !== generationRef.current || !mountedRef.current) return;
      if (appStateRef.current !== 'active') {
        heldRef.current = false;
        setMessage('Avvio sospeso: torna all’app e tieni premuto di nuovo per parlare.');
        changeState('idle');
        return;
      }
      if (!heldRef.current) {
        changeState('idle');
        return;
      }
      if (!permission.granted) {
        setMessage('Permesso microfono negato. Puoi comunque scrivere il comando.');
        changeState('idle');
        return;
      }
      if (!speech.isRecognitionAvailable()) {
        setMessage('Nessun servizio vocale Android disponibile. Verifica che l’app Google o Riconoscimento vocale e sintesi di Google sia installata e abilitata. Poi riprova. Puoi comunque scrivere il comando.');
        changeState('unavailable');
        return;
      }

      listenersRef.current = [
        speech.addListener('start', () => {
          if (generation !== generationRef.current || !mountedRef.current || !heldRef.current) return;
          changeState('listening');
        }),
        speech.addListener('result', (event) => {
          if (generation !== generationRef.current || !mountedRef.current || (!heldRef.current && !stoppingRef.current)) return;
          const finalTranscript = finalTranscriptFromResultEvent(event);
          if (finalTranscript) updateTranscript(finalTranscript);
        }),
        speech.addListener('error', (event) => {
          if (generation !== generationRef.current || !mountedRef.current) return;
          if (event?.error === 'aborted' && !stoppingRef.current) return;
          startedRef.current = false;
          stoppingRef.current = false;
          // abort() itself emits an error synchronously on Android. Detach first.
          clearListeners();
          try { speech.abort(); } catch { /* Keep the original recognition error. */ }
          let serviceInfo = '';
          try {
            const service = speech.getDefaultRecognitionService().packageName;
            const available = speech.getSpeechRecognitionServices();
            if (service || available.length) serviceInfo = ` Servizio: ${service || available.join(', ')}.`;
          } catch { /* Diagnostics must not replace the original error. */ }
          setMessage(describeSpeechRecognitionError(event) + serviceInfo);
          changeState('idle');
        }),
        speech.addListener('end', () => {
          if (generation !== generationRef.current || !mountedRef.current) return;
          startedRef.current = false;
          stoppingRef.current = false;
          clearListeners();
          if (mountedRef.current && !transcriptRef.current) {
            setMessage('Dettatura terminata senza testo. Tieni premuto finché compare “In ascolto”, parla e poi rilascia.');
          }
          changeState('idle');
        }),
      ];
      if (generation !== generationRef.current || !heldRef.current || !mountedRef.current) {
        clearListeners();
        setState('idle');
        return;
      }
      startedRef.current = true;
      changeState('starting');
      speech.start({ lang: 'it-IT', interimResults: true, continuous: false, requiresOnDeviceRecognition: false });
    } catch (error) {
      if (generation !== generationRef.current || !mountedRef.current) return;
      startedRef.current = false;
      clearListeners();
      if (mountedRef.current) {
        changeState('unavailable');
        const detail = error instanceof Error ? error.message.slice(0, 200) : 'errore sconosciuto';
        setMessage(`Impossibile avviare la dettatura: ${detail}. Puoi comunque scrivere il comando.`);
      }
    }
  }, [changeState, clearListeners, updateTranscript]);

  const release = useCallback(() => {
    heldRef.current = false;
    if (stateRef.current === 'requesting') {
      generationRef.current += 1;
      setMessage('Microfono non ancora pronto. Se hai appena autorizzato il permesso, tieni premuto di nuovo per parlare.');
      changeState('idle');
      return;
    }
    const speech = moduleRef.current;
    if (startedRef.current && speech) {
      stoppingRef.current = true;
      changeState('stopping');
      speech.stop();
    }
  }, [changeState]);

  const cancel = useCallback((reason?: string) => {
    const wasActive = ['requesting', 'starting', 'listening', 'stopping'].includes(stateRef.current);
    if (reason && wasActive && mountedRef.current) setMessage(reason);
    generationRef.current += 1;
    heldRef.current = false;
    stoppingRef.current = false;
    const wasStarted = startedRef.current;
    startedRef.current = false;
    clearListeners();
    if (wasStarted) {
      try { moduleRef.current?.abort(); } catch { /* Cancellation must remain safe. */ }
    }
    changeState('idle');
  }, [changeState, clearListeners]);

  const handleAppStateChange = useCallback((next: AppStateStatus) => {
    appStateRef.current = next;
    if (shouldCancelVoiceOnAppStateChange(stateRef.current, next)) {
      cancel('Dettatura annullata: Android ha portato l’app in secondo piano. Torna qui e riprova.');
    }
  }, [cancel]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      heldRef.current = false;
      generationRef.current += 1;
      const wasStarted = startedRef.current;
      startedRef.current = false;
      clearListeners();
      if (wasStarted) {
        try { moduleRef.current?.abort(); } catch { /* Cleanup must remain safe. */ }
      }
    };
  }, [clearListeners]);

  return { state, transcript, setTranscript: updateTranscript, message, begin, release, cancel, handleAppStateChange };
}
