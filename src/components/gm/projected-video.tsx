"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Maximize, Pause, Play, Volume2, VolumeX } from "lucide-react";

export function ProjectedVideo({ src, title }: { src: string; title: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(true);
  const [muted, setMuted] = useState(true);
  const [error, setError] = useState(false);
  // Autoplay can start before hydration attaches the onPlay handler.
  useEffect(() => { setPaused(ref.current?.paused ?? true); }, []);
  return <div className="group relative h-full w-full overflow-hidden bg-black">
    <video ref={ref} src={src} autoPlay muted={muted} loop playsInline preload="auto" aria-label={title} onPlay={() => setPaused(false)} onPause={() => setPaused(true)} onError={() => setError(true)} className="h-full w-full object-contain" />
    {error && <p role="alert" className="absolute inset-x-4 top-4 text-center text-white">Impossibile riprodurre il video. Verifica la connessione e il formato MP4/H.264.</p>}
    <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 rounded-lg bg-black/70 p-2 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 sm:opacity-0">
      <Button variant="ghost" className="text-white" aria-label={paused ? "Riproduci video" : "Pausa video"} onClick={() => { if (ref.current?.paused) void ref.current.play().catch(() => setError(true)); else ref.current?.pause(); }}>{paused ? <Play /> : <Pause />}</Button>
      <Button variant="ghost" className="text-white" aria-label={muted ? "Attiva audio" : "Disattiva audio"} onClick={() => setMuted(value => !value)}>{muted ? <VolumeX /> : <Volume2 />}</Button>
      <Button variant="ghost" className="text-white" aria-label="Schermo intero" onClick={() => void ref.current?.parentElement?.requestFullscreen?.().catch(() => {})}><Maximize /></Button>
    </div>
    {paused && !error && <Button className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" onClick={() => void ref.current?.play().catch(() => setError(true))}>Avvia video</Button>}
  </div>;
}
