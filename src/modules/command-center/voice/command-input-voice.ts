import type { CommandInputSource } from "../types/workspace";

export type VoiceInputMetadata = {
  engine: "web_speech_api";
  language: string;
  durationMs?: number;
  interimUsed?: boolean;
};

export type CommandInputVoicePayload = {
  source: Extract<CommandInputSource, "voice" | "text">;
  rawContent: string;
  transcript?: string | null;
  language?: string;
  metadata?: VoiceInputMetadata;
};

export function normalizeVoiceTranscript(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function buildCommandInputFromVoice(
  transcript: string,
  options?: { language?: string; durationMs?: number }
): CommandInputVoicePayload {
  const normalized = normalizeVoiceTranscript(transcript);
  return {
    source: "voice",
    rawContent: normalized,
    transcript: normalized,
    language: options?.language ?? "it-IT",
    metadata: {
      engine: "web_speech_api",
      language: options?.language ?? "it-IT",
      durationMs: options?.durationMs,
    },
  };
}

export function mergeTranscriptSegments(segments: string[]): string {
  return normalizeVoiceTranscript(segments.filter(Boolean).join(" "));
}
