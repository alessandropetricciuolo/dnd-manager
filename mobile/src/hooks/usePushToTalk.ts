import { useCallback, useEffect, useRef, useState } from 'react';
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
    start: (options: ExpoSpeechRecognitionOptions) => void;
    stop: () => void;
    abort: () => void;
  };
};

export type PushToTalkState = 'idle' | 'requesting' | 'listening' | 'stopping' | 'unavailable';

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
    if (stateRef.current === 'requesting' || stateRef.current === 'listening' || stateRef.current === 'stopping') return;
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
      if (generation !== generationRef.current || !heldRef.current || !mountedRef.current) {
        changeState('idle');
        return;
      }
      if (!permission.granted) {
        setMessage('Permesso microfono negato. Puoi comunque scrivere il comando.');
        changeState('idle');
        return;
      }
      if (!speech.isRecognitionAvailable()) {
        setMessage('Riconoscimento vocale non disponibile sul dispositivo. Puoi scrivere il comando.');
        changeState('unavailable');
        return;
      }

      listenersRef.current = [
        speech.addListener('result', (event) => {
          if (!mountedRef.current || (!heldRef.current && !stoppingRef.current)) return;
          const finalTranscript = finalTranscriptFromResultEvent(event);
          if (finalTranscript) updateTranscript(finalTranscript);
        }),
        speech.addListener('error', (event) => {
          if (!mountedRef.current) return;
          if (event?.error === 'aborted' && !stoppingRef.current) return;
          startedRef.current = false;
          stoppingRef.current = false;
          speech.abort();
          clearListeners();
          setMessage(event?.error === 'not-allowed'
            ? 'Permesso microfono negato. Puoi comunque scrivere il comando.'
            : 'Riconoscimento interrotto. Puoi correggere o scrivere il comando.');
          changeState('idle');
        }),
        speech.addListener('end', () => {
          startedRef.current = false;
          stoppingRef.current = false;
          clearListeners();
          changeState('idle');
        }),
      ];
      if (generation !== generationRef.current || !heldRef.current || !mountedRef.current) {
        clearListeners();
        setState('idle');
        return;
      }
      speech.start({ lang: 'it-IT', interimResults: true, continuous: false, addsPunctuation: true });
      startedRef.current = true;
      changeState('listening');
    } catch {
      if (generation !== generationRef.current || !mountedRef.current) return;
      startedRef.current = false;
      clearListeners();
      if (mountedRef.current) {
        changeState('unavailable');
        setMessage('Modulo vocale assente: installa una nuova build dell’app. Puoi comunque scrivere il comando.');
      }
    }
  }, [changeState, clearListeners, updateTranscript]);

  const release = useCallback(() => {
    heldRef.current = false;
    if (stateRef.current === 'requesting') {
      generationRef.current += 1;
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

  const cancel = useCallback(() => {
    generationRef.current += 1;
    heldRef.current = false;
    stoppingRef.current = false;
    if (startedRef.current) moduleRef.current?.abort();
    startedRef.current = false;
    clearListeners();
    changeState('idle');
  }, [changeState, clearListeners]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      heldRef.current = false;
      generationRef.current += 1;
      if (startedRef.current) moduleRef.current?.abort();
      clearListeners();
    };
  }, [clearListeners]);

  return { state, transcript, setTranscript: updateTranscript, message, begin, release, cancel };
}
