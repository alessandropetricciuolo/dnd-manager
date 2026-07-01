"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionResultEvent = {
  resultIndex: number;
  results: SpeechRecognitionResultList;
};

type SpeechRecognitionResultList = {
  length: number;
  [index: number]: SpeechRecognitionResult;
};

type SpeechRecognitionResult = {
  isFinal: boolean;
  [index: number]: { transcript: string };
};

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

export function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

export type UseVoiceDictationOptions = {
  language?: string;
  onFinalTranscript?: (transcript: string, durationMs: number) => void;
};

export type UseVoiceDictationState = {
  isSupported: boolean;
  isListening: boolean;
  interimTranscript: string;
  finalTranscript: string;
  error: string | null;
  start: () => void;
  stop: () => void;
  toggle: () => void;
  reset: () => void;
};

export function useVoiceDictation(options: UseVoiceDictationOptions = {}): UseVoiceDictationState {
  const language = options.language ?? "it-IT";
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const finalsRef = useRef<string[]>([]);
  const interimRef = useRef("");
  const onFinalRef = useRef(options.onFinalTranscript);
  onFinalRef.current = options.onFinalTranscript;

  useEffect(() => {
    setIsSupported(isSpeechRecognitionSupported());
  }, []);

  const reset = useCallback(() => {
    setInterimTranscript("");
    setFinalTranscript("");
    setError(null);
    finalsRef.current = [];
    interimRef.current = "";
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setError("Il browser non supporta il riconoscimento vocale.");
      return;
    }

    setError(null);
    setInterimTranscript("");
    setFinalTranscript("");
    finalsRef.current = [];
    interimRef.current = "";

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const piece = result[0]?.transcript ?? "";
        if (result.isFinal) finalsRef.current.push(piece);
        else interim += piece;
      }
      interimRef.current = interim;
      setInterimTranscript(interim);
      setFinalTranscript(finalsRef.current.join(" ").trim());
    };

    recognition.onerror = (event) => {
      if (event.error === "aborted" || event.error === "no-speech") return;
      setError(
        event.error === "not-allowed"
          ? "Permesso microfono negato."
          : `Errore riconoscimento vocale: ${event.error}`
      );
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      const merged = [...finalsRef.current, interimRef.current]
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      const durationMs = startedAtRef.current ? Date.now() - startedAtRef.current : 0;
      startedAtRef.current = null;
      recognitionRef.current = null;
      if (merged) {
        onFinalRef.current?.(merged, durationMs);
      }
    };

    try {
      startedAtRef.current = Date.now();
      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossibile avviare il microfono.");
      setIsListening(false);
    }
  }, [language]);

  const toggle = useCallback(() => {
    if (isListening) stop();
    else start();
  }, [isListening, start, stop]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  return {
    isSupported,
    isListening,
    interimTranscript,
    finalTranscript,
    error,
    start,
    stop,
    toggle,
    reset,
  };
}
