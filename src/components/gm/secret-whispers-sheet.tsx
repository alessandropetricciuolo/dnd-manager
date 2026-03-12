"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Image as ImageIcon, Send, Loader2, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import {
  getCampaignPlayersForWhispers,
  getSecretWhispers,
  insertSecretWhisper,
  type WhisperPlayer,
  type SecretWhisperRow,
} from "@/app/campaigns/whisper-actions";
import { uploadFileToTelegram } from "@/app/actions/upload-telegram";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { it } from "date-fns/locale";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  currentUserId: string;
};

function proxyImageUrl(fileIdOrUrl: string): string {
  if (fileIdOrUrl.startsWith("http") || fileIdOrUrl.startsWith("/")) return fileIdOrUrl;
  return `/api/tg-image/${encodeURIComponent(fileIdOrUrl)}`;
}

export function SecretWhispersSheet({
  open,
  onOpenChange,
  campaignId,
  currentUserId,
}: Props) {
  const [players, setPlayers] = useState<WhisperPlayer[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<WhisperPlayer | null>(null);
  const [messages, setMessages] = useState<SecretWhisperRow[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [imageToSend, setImageToSend] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof createSupabaseBrowserClient>["channel"]> | null>(null);

  const loadPlayers = useCallback(async () => {
    setLoadingPlayers(true);
    const res = await getCampaignPlayersForWhispers(campaignId);
    setLoadingPlayers(false);
    if (!res.success) {
      toast.error(res.error ?? "Errore caricamento giocatori");
      setPlayers([]);
    } else if (res.data) setPlayers(res.data);
  }, [campaignId]);

  useEffect(() => {
    if (open) loadPlayers();
  }, [open, loadPlayers]);

  const loadMessages = useCallback(
    async (otherId: string) => {
      setLoadingMessages(true);
      const res = await getSecretWhispers(campaignId, currentUserId, otherId);
      setLoadingMessages(false);
      if (res.success && res.data) setMessages(res.data);
      else setMessages([]);
    },
    [campaignId, currentUserId]
  );

  useEffect(() => {
    if (!selectedPlayer) {
      setMessages([]);
      return;
    }
    loadMessages(selectedPlayer.id);
  }, [selectedPlayer, loadMessages]);

  // Realtime: subscribe to INSERT on secret_whispers for this campaign
  useEffect(() => {
    if (!open || !campaignId || !selectedPlayer?.id) return;
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`whispers-${campaignId}-${selectedPlayer.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "secret_whispers",
          filter: `campaign_id=eq.${campaignId}`,
        },
        (payload) => {
          const row = payload.new as SecretWhisperRow;
          const isForThisConversation =
            (row.sender_id === currentUserId && row.receiver_id === selectedPlayer.id) ||
            (row.sender_id === selectedPlayer.id && row.receiver_id === currentUserId);
          if (isForThisConversation) {
            setMessages((prev) => [...prev, row]);
          }
        }
      )
      .subscribe();
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [open, campaignId, currentUserId, selectedPlayer?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleImageSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || !file.type.startsWith("image/")) return;
      setUploadingImage(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "photo");
      const result = await uploadFileToTelegram(formData);
      setUploadingImage(false);
      if (result.success) {
        setImageToSend(`/api/tg-image/${result.fileId}`);
      } else {
        toast.error(result.error ?? "Errore upload immagine");
      }
    },
    []
  );

  const handleSend = useCallback(async () => {
    if (!selectedPlayer) return;
    const hasText = messageText.trim() !== "";
    const hasImage = imageToSend != null && imageToSend.trim() !== "";
    if (!hasText && !hasImage) return;
    setSending(true);
    const res = await insertSecretWhisper(campaignId, selectedPlayer.id, {
      message: hasText ? messageText.trim() : null,
      image_url: hasImage ? imageToSend : null,
    });
    setSending(false);
    if (res.success) {
      setMessageText("");
      setImageToSend(null);
    } else {
      toast.error(res.error ?? "Errore invio");
    }
  }, [campaignId, selectedPlayer, messageText, imageToSend]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col border-amber-600/30 bg-zinc-950 p-0 sm:max-w-md"
      >
        <SheetHeader className="shrink-0 border-b border-amber-600/20 px-4 py-3">
          <SheetTitle className="text-left text-amber-200">
            Sussurri Segreti
          </SheetTitle>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* Lista giocatori */}
          <div className="shrink-0 border-b border-amber-600/20 px-3 py-3">
            {loadingPlayers ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
              </div>
            ) : players.length === 0 ? (
              <p className="text-center text-sm text-zinc-500">
                Nessun giocatore in campagna.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {players.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPlayer(p)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                      selectedPlayer?.id === p.id
                        ? "border-amber-500 bg-amber-500/20 text-amber-100"
                        : "border-amber-600/30 bg-zinc-900/80 text-zinc-300 hover:bg-amber-600/10"
                    )}
                  >
                    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-zinc-700">
                      {p.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.avatar_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-xs font-medium text-amber-400">
                          {p.label.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="max-w-[120px] truncate">{p.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Area chat */}
          {selectedPlayer ? (
            <>
              <div
                ref={scrollRef}
                className="min-h-0 flex-1 overflow-y-auto px-3 py-4"
              >
                <div className="flex flex-col gap-3">
                  {loadingMessages ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isFromMe = msg.sender_id === currentUserId;
                      return (
                        <div
                          key={msg.id}
                          className={cn(
                            "max-w-[85%] rounded-lg border px-3 py-2",
                            isFromMe
                              ? "ml-auto border-amber-600/40 bg-amber-950/50 text-amber-100"
                              : "mr-auto border-zinc-600/40 bg-zinc-800/80 text-zinc-200"
                          )}
                        >
                          {msg.message && (
                            <p className="whitespace-pre-wrap text-sm">{msg.message}</p>
                          )}
                          {msg.image_url && (
                            <a
                              href={proxyImageUrl(msg.image_url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 block"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={proxyImageUrl(msg.image_url)}
                                alt=""
                                className="max-h-48 rounded border border-amber-600/20 object-contain"
                              />
                            </a>
                          )}
                          <p
                            className={cn(
                              "mt-1 text-[10px]",
                              isFromMe ? "text-amber-400/70" : "text-zinc-500"
                            )}
                          >
                            {format(new Date(msg.created_at), "HH:mm · d MMM", { locale: it })}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Input invio */}
              <div className="shrink-0 border-t border-amber-600/20 p-3">
                {imageToSend && (
                  <div className="relative mb-2 inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={proxyImageUrl(imageToSend)}
                      alt=""
                      className="h-20 rounded border border-amber-600/30 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setImageToSend(null)}
                      className="absolute -right-1 -top-1 rounded-full bg-zinc-800 p-0.5 text-zinc-400 hover:bg-red-900 hover:text-red-200"
                      aria-label="Rimuovi immagine"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageSelect}
                      disabled={uploadingImage || sending}
                    />
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-amber-600/30 bg-zinc-900 text-amber-400 hover:bg-amber-600/20 disabled:opacity-50">
                      {uploadingImage ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ImageIcon className="h-4 w-4" />
                      )}
                    </span>
                  </label>
                  <Input
                    placeholder="Scrivi un messaggio..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    disabled={sending}
                    className="min-w-0 flex-1 border-amber-600/30 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500"
                  />
                  <Button
                    type="button"
                    size="icon"
                    onClick={handleSend}
                    disabled={
                      sending ||
                      (messageText.trim() === "" && !imageToSend)
                    }
                    className="shrink-0 bg-amber-600 text-zinc-950 hover:bg-amber-500"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-zinc-500">
              Seleziona un giocatore per iniziare la conversazione.
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
