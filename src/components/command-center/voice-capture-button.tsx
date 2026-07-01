"use client";

import { Mic, MicOff } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useVoiceDictation,
  type UseVoiceDictationState,
} from "@/modules/command-center/voice/use-voice-dictation";

type VoiceMicButtonProps = {
  voice: UseVoiceDictationState;
  disabled?: boolean;
  className?: string;
};

export function VoiceMicButton({ voice, disabled = false, className }: VoiceMicButtonProps) {
  if (!voice.isSupported) return null;

  return (
    <Button
      type="button"
      variant={voice.isListening ? "default" : "outline"}
      size="icon"
      disabled={disabled}
      className={cn(
        "shrink-0",
        voice.isListening && "animate-pulse bg-red-700 hover:bg-red-700",
        className
      )}
      title={voice.isListening ? "Ferma dettatura" : "Dettatura vocale"}
      onClick={voice.toggle}
    >
      {voice.isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </Button>
  );
}

type VoiceCaptureButtonProps = {
  language?: string;
  disabled?: boolean;
  className?: string;
  onTranscript: (transcript: string, durationMs: number) => void;
  onListeningChange?: (listening: boolean) => void;
};

export function VoiceCaptureButton({
  language = "it-IT",
  disabled = false,
  className,
  onTranscript,
  onListeningChange,
}: VoiceCaptureButtonProps) {
  const voice = useVoiceDictation({
    language,
    onFinalTranscript: onTranscript,
  });

  useEffect(() => {
    onListeningChange?.(voice.isListening);
  }, [voice.isListening, onListeningChange]);

  useEffect(() => {
    if (voice.error) toast.error(voice.error);
  }, [voice.error]);

  return <VoiceMicButton voice={voice} disabled={disabled} className={className} />;
}

type VoiceInterimHintProps = {
  listening: boolean;
  interim: string;
  finalPreview?: string;
};

export function VoiceInterimHint({ listening, interim, finalPreview }: VoiceInterimHintProps) {
  if (!listening && !interim && !finalPreview) return null;
  const preview = interim || finalPreview;
  return (
    <p className="text-[10px] text-barber-gold/80">
      {listening ? "In ascolto…" : "Dettatura"}
      {preview ? `: ${preview}` : " — parla ora"}
    </p>
  );
}
