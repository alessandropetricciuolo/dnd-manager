"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearStoredTokens,
  getValidAccessToken,
  playPlaylistOnDevice,
  readStoredTokens,
  transferPlaybackToDevice,
} from "@/lib/spotify/oauth-pkce";
import {
  createWebPlayer,
  loadSpotifyPlayerSdk,
  type SpotifyPlaybackState,
  type SpotifyWebPlayerInstance,
} from "@/lib/spotify/load-player-sdk";

export type SpotifyPlayerStatus = "idle" | "connecting" | "ready" | "error";

export function useSpotifyWebPlayer() {
  const [connected, setConnected] = useState(() => Boolean(readStoredTokens()));
  const [status, setStatus] = useState<SpotifyPlayerStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [playback, setPlayback] = useState<SpotifyPlaybackState | null>(null);
  const playerRef = useRef<SpotifyWebPlayerInstance | null>(null);
  const deviceIdRef = useRef<string | null>(null);

  const getToken = useCallback(async () => getValidAccessToken(), []);

  const disconnect = useCallback(() => {
    playerRef.current?.disconnect();
    playerRef.current = null;
    deviceIdRef.current = null;
    clearStoredTokens();
    setConnected(false);
    setStatus("idle");
    setPlayback(null);
    setError(null);
  }, []);

  const initPlayer = useCallback(async () => {
    const token = await getValidAccessToken();
    if (!token) {
      setConnected(false);
      setStatus("idle");
      return;
    }
    setConnected(true);
    setStatus("connecting");
    setError(null);
    try {
      await loadSpotifyPlayerSdk();
      playerRef.current?.disconnect();
      const player = createWebPlayer(getToken);
      playerRef.current = player;

      player.addListener("ready", (state) => {
        const s = state as { device_id?: string };
        if (typeof s.device_id === "string") deviceIdRef.current = s.device_id;
        setStatus("ready");
      });
      player.addListener("not_ready", () => setStatus("connecting"));
      player.addListener("player_state_changed", (state) => {
        setPlayback(state as SpotifyPlaybackState | null);
      });
      player.addListener("initialization_error", (state) => {
        const s = state as { message?: string };
        setError(s.message ?? "init_error");
        setStatus("error");
      });
      player.addListener("authentication_error", () => {
        disconnect();
      });
      player.addListener("account_error", () => {
        setError("Serve un account Spotify Premium per la riproduzione completa.");
        setStatus("error");
      });

      const ok = await player.connect();
      if (!ok) {
        setError("Impossibile attivare il player Spotify.");
        setStatus("error");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "player_error");
      setStatus("error");
    }
  }, [disconnect, getToken]);

  useEffect(() => {
    if (connected) void initPlayer();
    return () => {
      playerRef.current?.disconnect();
      playerRef.current = null;
      deviceIdRef.current = null;
    };
  }, [connected, initPlayer]);

  const playPlaylist = useCallback(
    async (playlistId: string) => {
      const id = playlistId.trim();
      if (!id) return;
      const token = await getValidAccessToken();
      const deviceId = deviceIdRef.current;
      if (!token || !deviceId) {
        setError("Collega Spotify e attendi che il player sia pronto.");
        return;
      }
      try {
        await transferPlaybackToDevice(token, deviceId);
        await playPlaylistOnDevice(token, deviceId, id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "play_error");
      }
    },
    []
  );

  const togglePlay = useCallback(async () => {
    const p = playerRef.current;
    if (!p) return;
    await p.togglePlay();
  }, []);

  const markConnected = useCallback(() => {
    setConnected(true);
  }, []);

  return {
    connected,
    status,
    error,
    playback,
    markConnected,
    disconnect,
    initPlayer,
    playPlaylist,
    togglePlay,
  };
}
