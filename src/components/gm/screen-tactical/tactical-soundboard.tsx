"use client";

import { useEffect, useRef, useState } from "react";
import { Music, Pause, Play, Settings2, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const SOUND_PRESETS = [
  { id: "tavern", name: "Tavern Ambience", desc: "Mormorio di folla, boccali e camino scoppiettante" },
  { id: "combat", name: "Combat Drums", desc: "Tamburi di guerra ed eco di acciaio battuto" },
  { id: "dungeon", name: "Dark Dungeon", desc: "Eco profondo di gocce e vento sotterraneo" },
  { id: "forest", name: "Mystic Forest", desc: "Fruscio di foglie notturne e canti fatati" },
  { id: "rain", name: "Rain & Thunder", desc: "Pioggia battente su tetti d'ardesia e tuoni lontani" },
];

export function TacticalSoundboard() {
  const [selectedTrack, setSelectedTrack] = useState("tavern");
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState([65]);
  const [isMuted, setIsMuted] = useState(false);

  // Web Audio procedural ambient generator
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const oscNodesRef = useRef<OscillatorNode[]>([]);
  const noiseNodeRef = useRef<AudioNode | null>(null);

  function stopAudio() {
    try {
      oscNodesRef.current.forEach((osc) => {
        try {
          osc.stop();
          osc.disconnect();
        } catch {}
      });
      oscNodesRef.current = [];

      if (noiseNodeRef.current) {
        try {
          noiseNodeRef.current.disconnect();
        } catch {}
        noiseNodeRef.current = null;
      }
    } catch {}
  }

  function startAudio(trackId: string) {
    stopAudio();

    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        void ctx.resume();
      }

      const masterGain = ctx.createGain();
      const currentVol = isMuted ? 0 : volume[0] / 100;
      masterGain.gain.setValueAtTime(currentVol * 0.25, ctx.currentTime);
      masterGain.connect(ctx.destination);
      gainNodeRef.current = masterGain;

      // Frequenze ambientali calde in base al tema selezionato
      let freqs = [110, 164.81, 220]; // A2, E3, A3
      if (trackId === "dungeon") freqs = [55, 82.41, 110]; // Low drone
      if (trackId === "combat") freqs = [73.42, 110, 146.83]; // D2, A2, D3
      if (trackId === "forest") freqs = [174.61, 261.63, 329.63]; // F3, C4, E4
      if (trackId === "rain") freqs = [80, 120, 180];

      const oscs: OscillatorNode[] = [];
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        osc.type = idx === 0 ? "sine" : "triangle";
        osc.frequency.setValueAtTime(f, ctx.currentTime);

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(350, ctx.currentTime);

        osc.connect(filter);
        filter.connect(masterGain);
        osc.start();
        oscs.push(osc);
      });
      oscNodesRef.current = oscs;
    } catch (err) {
      console.warn("Web Audio ambient warning:", err);
    }
  }

  function togglePlay() {
    if (isPlaying) {
      stopAudio();
      setIsPlaying(false);
    } else {
      startAudio(selectedTrack);
      setIsPlaying(true);
    }
  }

  // Update volume live
  useEffect(() => {
    if (gainNodeRef.current && audioCtxRef.current) {
      const currentVol = isMuted ? 0 : volume[0] / 100;
      gainNodeRef.current.gain.setValueAtTime(currentVol * 0.25, audioCtxRef.current.currentTime);
    }
  }, [volume, isMuted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio();
      if (audioCtxRef.current) {
        void audioCtxRef.current.close();
      }
    };
  }, []);

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-brass-base/30 bg-[#120d09]/95 text-parchment-100 shadow-lg">
      {/* Header Soundboard */}
      <div className="shrink-0 flex items-center justify-between border-b border-brass-base/20 bg-[#19110b] px-3 py-2">
        <div className="flex items-center gap-1.5 font-cinzel text-xs font-bold uppercase tracking-wider text-brass-light">
          <Music className="h-3.5 w-3.5 text-brass-base" />
          <span>Ambient Soundboard</span>
        </div>
        <Settings2 className="h-3.5 w-3.5 text-brass-base/60" />
      </div>

      <div className="p-3 space-y-3">
        {/* Slider Volume */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsMuted((m) => !m)}
            className="text-brass-light hover:text-amber-200 transition-colors"
            title={isMuted ? "Attiva audio" : "Silenzia"}
          >
            {isMuted || volume[0] === 0 ? (
              <VolumeX className="h-4 w-4 text-rose-400" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>
          <Slider
            value={isMuted ? [0] : volume}
            max={100}
            step={1}
            onValueChange={(val) => {
              if (isMuted) setIsMuted(false);
              setVolume(val);
            }}
            className="flex-1"
          />
          <span className="w-7 text-right font-mono text-[10px] text-parchment-400">
            {isMuted ? "0%" : `${volume[0]}%`}
          </span>
        </div>

        {/* Selettore Canale Sonoro */}
        <div className="space-y-1">
          <div className="text-[10px] font-cinzel uppercase tracking-wider text-parchment-400">
            Traccia d&apos;Atmosfera
          </div>
          <Select
            value={selectedTrack}
            onValueChange={(val) => {
              setSelectedTrack(val);
              if (isPlaying) startAudio(val);
            }}
          >
            <SelectTrigger className="h-8 border-brass-base/30 bg-[#1a120c] font-cinzel text-xs text-parchment-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-brass-base/40 bg-[#150f0b] text-parchment-100">
              {SOUND_PRESETS.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-xs focus:bg-brass-base/20 focus:text-brass-light font-cinzel">
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Bottone d'Azione Primario ▶ PLAYING */}
        <Button
          type="button"
          onClick={togglePlay}
          className={cn(
            "w-full h-9 font-cinzel text-xs font-black tracking-widest uppercase transition-all shadow-md",
            isPlaying
              ? "bg-gradient-to-r from-emerald-800 to-emerald-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.3)] hover:from-emerald-700 hover:to-emerald-500"
              : "bg-gradient-to-r from-guild-gold to-brass-base text-guild-black hover:opacity-95"
          )}
        >
          {isPlaying ? (
            <>
              <Pause className="mr-1.5 h-3.5 w-3.5 fill-current" />
              PLAYING ({SOUND_PRESETS.find((p) => p.id === selectedTrack)?.name})
            </>
          ) : (
            <>
              <Play className="mr-1.5 h-3.5 w-3.5 fill-current" />
              RIPRODUCI ATMOSFERA
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
