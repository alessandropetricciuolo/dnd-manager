"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Mail, Loader2, Send, Image as ImageIcon, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import {
  getSecretWhispers,
  insertSecretWhisper,
  type SecretWhisperRow,
} from "@/app/campaigns/whisper-actions";
import { uploadFileToTelegram } from "@/app/actions/upload-telegram";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { it } from "date-fns/locale";

type PlayerSecretChatProps = {
  campaignId: string;
  currentUserId: string;
  gmId: string;
};

function proxyImageUrl(fileIdOrUrl: string): string {
  if (fileIdOrUrl.startsWith("http") || fileIdOrUrl.startsWith("/")) return fileIdOrUrl;
  return `/api/tg-image/${encodeURIComponent(fileIdOrUrl)}`;
}

export function PlayerSecretChat({ campaignId, currentUserId, gmId }: PlayerSecretChatProps) {
  const [open, setOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [messages, setMessages] = useState<SecretWhisperRow[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [imageToSend, setImageToSend] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const loadMessages = useCallback(async () => {
    setLoadingMessages(true);
    const res = await getSecretWhispers(campaignId, currentUserId, gmId);
    setLoadingMessages(false);
    if (res.success && res.data) setMessages(res.data);
    else setMessages([]);
  }, [campaignId, currentUserId, gmId]);

  useEffect(() => {
    if (open) {
      loadMessages();
      setHasUnread(false);
    }
  }, [open, loadMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`whispers-player-${campaignId}-${currentUserId}`)
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
          const isBetweenMeAndGm =
            (row.sender_id === currentUserId && row.receiver_id === gmId) ||
            (row.sender_id === gmId && row.receiver_id === currentUserId);
          if (!isBetweenMeAndGm) return;
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
          if (!open && row.sender_id === gmId && row.receiver_id === currentUserId) {
            setHasUnread(true);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId, currentUserId, gmId, open]);

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
    const hasText = messageText.trim() !== "";
    const hasImage = imageToSend != null && imageToSend.trim() !== "";
    if (!hasText && !hasImage) return;
    setSending(true);
    const res = await insertSecretWhisper(campaignId, gmId, {
      message: hasText ? messageText.trim() : null,
      image_url: hasImage ? imageToSend : null,
    });
    setSending(false);
    if (res.success) {
      setMessageText("");
      setImageToSend(null);
      if (res.data) {
        setMessages((prev) => [...prev, res.data!]);
      }
    } else {
      toast.error(res.error ?? "Errore invio");
    }
  }, [campaignId, gmId, messageText, imageToSend]);

  return (
    <>
      <div className="fixed bottom-6 right-6 z-30">
        <Button
          type="button"
          size="icon"
          onClick={() => setOpen(true)}
          className="relative h-12 w-12 rounded-full bg-barber-gold text-barber-dark shadow-lg shadow-amber-900/40 hover:bg-amber-400"
          aria-label="Apri Sussurri del Master"
          title="Sussurri del Master"
        >
          <Mail className="h-6 w-6" />
          {hasUnread && (
            <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500/70" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
          )}
        </Button>
      </div>

      <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (v) setHasUnread(false); }}>
        <SheetContent
          side="right"
          className="flex w-full flex-col border-barber-gold/30 bg-barber-dark sm:max-w-md"
        >
          <SheetHeader className="border-b border-barber-gold/30 pb-3">
            <SheetTitle className="text-left text-barber-gold">
              Sussurri del Master
            </SheetTitle>
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden pt-2">
            <div
              ref={scrollRef}
              className="min-h-0 flex-1 space-y-3 overflow-y-auto px-2 py-3"
            >
              {loadingMessages ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-barber-gold" />
                </div>
              ) : messages.length === 0 ? (
                <p className="px-2 py-4 text-center text-sm text-barber-paper/60">
                  In attesa di un sussurro dal Master...
                </p>
              ) : (
                messages.map((msg) => {
                  const isFromMe = msg.sender_id === currentUserId;
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "max-w-[85%] rounded-lg border px-3 py-2 text-sm",
                        isFromMe
                          ? "ml-auto border-barber-gold/40 bg-barber-dark/80 text-barber-paper"
                          : "mr-auto border-purple-700/50 bg-purple-950/60 text-barber-gold"
                      )}
                    >
                      {msg.message && (
                        <p className="whitespace-pre-wrap leading-relaxed">
                          {msg.message}
                        </p>
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
                            className="max-h-52 rounded border border-barber-gold/30 object-contain"
                          />
                        </a>
                      )}
                      <p
                        className={cn(
                          "mt-1 text-[10px]",
                          isFromMe ? "text-barber-paper/60" : "text-barber-gold/70"
                        )}
                      >
                        {format(new Date(msg.created_at), "HH:mm · d MMM", { locale: it })}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            <div className="shrink-0 border-t border-barber-gold/30 p-3">
              {imageToSend && (
                <div className="relative mb-2 inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={proxyImageUrl(imageToSend)}
                    alt=""
                    className="h-20 rounded border border-barber-gold/30 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setImageToSend(null)}
                    className="absolute -right-1 -top-1 rounded-full bg-barber-dark p-0.5 text-barber-paper/70 hover:bg-red-900 hover:text-red-200"
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
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-barber-gold/40 bg-barber-dark text-barber-gold hover:bg-barber-gold/15 disabled:opacity-50">
                    {uploadingImage ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ImageIcon className="h-4 w-4" />
                    )}
                  </span>
                </label>
                <Input
                  placeholder="Rispondi al Master..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={sending}
                  className="min-w-0 flex-1 border-barber-gold/40 bg-barber-dark text-barber-paper placeholder:text-barber-paper/50"
                />
                <Button
                  type="button"
                  size="icon"
                  onClick={handleSend}
                  disabled={sending || (messageText.trim() === "" && !imageToSend)}
                  className="shrink-0 bg-barber-gold text-barber-dark hover:bg-amber-400"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

