"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Mail, Send, RotateCw, Eye, Bold, Heading2, Link as LinkIcon, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminCommunicationRow } from "./page";
import {
  createAdminCommunicationDraftAction,
  getAdminCommunicationRecipientsAction,
  sendAdminCommunicationAction,
} from "./actions";

type RecipientView = {
  id: string;
  player_id: string;
  player_name: string;
  recipient_email: string | null;
  status: "pending" | "sent" | "failed" | "skipped_no_email";
  sent_at: string | null;
  last_error: string | null;
};

function statusBadge(status: RecipientView["status"]) {
  if (status === "sent") return <Badge className="bg-emerald-700/80 text-white">Inviata</Badge>;
  if (status === "failed") return <Badge className="bg-red-700/80 text-white">Fallita</Badge>;
  if (status === "skipped_no_email") return <Badge className="bg-amber-700/80 text-white">Nessuna email</Badge>;
  return <Badge variant="outline" className="border-barber-gold/40 text-barber-paper/90">Da inviare</Badge>;
}

function toolButtonClass() {
  return "h-8 border-barber-gold/30 text-barber-paper/90 hover:bg-barber-gold/10";
}

export function AdminCommunicationsClient({
  initialCommunications,
}: {
  initialCommunications: AdminCommunicationRow[];
}) {
  const router = useRouter();
  const htmlRef = useRef<HTMLTextAreaElement | null>(null);
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("<h2>Titolo comunicazione</h2><p>Scrivi qui il tuo messaggio...</p>");
  const [selectedCommunicationId, setSelectedCommunicationId] = useState<string | null>(
    initialCommunications[0]?.id ?? null
  );
  const [recipients, setRecipients] = useState<RecipientView[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [isPending, startTransition] = useTransition();

  const selectedCommunication = useMemo(
    () => initialCommunications.find((c) => c.id === selectedCommunicationId) ?? null,
    [initialCommunications, selectedCommunicationId]
  );

  useEffect(() => {
    if (selectedCommunicationId) {
      void loadRecipients(selectedCommunicationId);
    }
  }, [selectedCommunicationId]);

  async function loadRecipients(communicationId: string) {
    setLoadingRecipients(true);
    const result = await getAdminCommunicationRecipientsAction(communicationId);
    if (!result.success) {
      toast.error(result.message);
      setLoadingRecipients(false);
      return;
    }
    setRecipients(result.data);
    setLoadingRecipients(false);
  }

  function wrapSelection(prefix: string, suffix = prefix) {
    const textarea = htmlRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const source = bodyHtml;
    const selected = source.slice(start, end);
    const next = `${source.slice(0, start)}${prefix}${selected}${suffix}${source.slice(end)}`;
    setBodyHtml(next);
  }

  function insertAtEnd(html: string) {
    setBodyHtml((prev) => `${prev}\n${html}`);
  }

  function createDraft() {
    startTransition(async () => {
      const result = await createAdminCommunicationDraftAction(subject, bodyHtml);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setSelectedCommunicationId(result.communicationId ?? null);
      router.refresh();
    });
  }

  function sendCommunication(onlyPending: boolean) {
    if (!selectedCommunicationId) {
      toast.error("Seleziona una comunicazione dall'archivio.");
      return;
    }
    startTransition(async () => {
      const result = await sendAdminCommunicationAction(selectedCommunicationId, onlyPending);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      await loadRecipients(selectedCommunicationId);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-barber-gold/30 bg-barber-dark/80 p-4 space-y-4">
        <h2 className="text-base font-semibold text-barber-gold">Nuova comunicazione</h2>
        <Input
          placeholder="Oggetto email (es. Nuovo evento live - Domenica)"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="bg-barber-dark border-barber-gold/30 text-barber-paper"
        />

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className={toolButtonClass()} onClick={() => wrapSelection("<strong>", "</strong>")}>
            <Bold className="mr-1 h-4 w-4" /> Bold
          </Button>
          <Button variant="outline" size="sm" className={toolButtonClass()} onClick={() => insertAtEnd("<h2>Titolo sezione</h2>")}>
            <Heading2 className="mr-1 h-4 w-4" /> Heading
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={toolButtonClass()}
            onClick={() => insertAtEnd('<p><a href="https://barberanddragons.com" target="_blank" rel="noopener noreferrer">Link utile</a></p>')}
          >
            <LinkIcon className="mr-1 h-4 w-4" /> Link
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={toolButtonClass()}
            onClick={() => insertAtEnd('<img src="https://..." alt="Immagine" style="max-width:100%;height:auto;border-radius:8px;" />')}
          >
            <ImageIcon className="mr-1 h-4 w-4" /> Immagine
          </Button>
        </div>

        <Textarea
          ref={htmlRef}
          value={bodyHtml}
          onChange={(e) => setBodyHtml(e.target.value)}
          className="min-h-[220px] resize-y bg-barber-dark border-barber-gold/30 text-barber-paper font-mono text-xs"
        />

        <div className="rounded-lg border border-barber-gold/20 bg-black/20 p-3">
          <p className="mb-2 inline-flex items-center gap-2 text-xs uppercase tracking-wide text-barber-paper/60">
            <Eye className="h-3.5 w-3.5" />
            Anteprima HTML
          </p>
          <div
            className="prose prose-invert max-w-none text-sm [&_a]:text-barber-gold [&_img]:rounded-md"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={createDraft}
            disabled={isPending}
            className="bg-violet-600 text-white hover:bg-violet-500"
          >
            <Mail className="mr-2 h-4 w-4" />
            Salva in archivio
          </Button>
          <Button type="button" variant="outline" onClick={() => sendCommunication(false)} disabled={isPending}>
            <Send className="mr-2 h-4 w-4" />
            Invia a tutti (selezionata)
          </Button>
          <Button type="button" variant="outline" onClick={() => sendCommunication(true)} disabled={isPending}>
            <RotateCw className="mr-2 h-4 w-4" />
            Reinoltra ai non inviati
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-barber-gold/30 bg-barber-dark/80 p-4 space-y-4">
        <h2 className="text-base font-semibold text-barber-gold">Archivio comunicazioni</h2>

        <div className="grid gap-3 md:grid-cols-2">
          <select
            value={selectedCommunicationId ?? ""}
            onChange={(e) => {
              const id = e.target.value || null;
              setSelectedCommunicationId(id);
              if (id) void loadRecipients(id);
            }}
            className="h-10 rounded-md border border-barber-gold/30 bg-barber-dark px-3 text-sm text-barber-paper"
          >
            <option value="">Seleziona comunicazione...</option>
            {initialCommunications.map((c) => (
              <option key={c.id} value={c.id}>
                {new Date(c.created_at).toLocaleString("it-IT")} · {c.subject}
              </option>
            ))}
          </select>
          <div className="text-sm text-barber-paper/70">
            {selectedCommunication ? (
              <span>
                Totale: {selectedCommunication.stats.total} · Inviate: {selectedCommunication.stats.sent} · Da inviare:{" "}
                {selectedCommunication.stats.pending} · Fallite: {selectedCommunication.stats.failed} · Senza email:{" "}
                {selectedCommunication.stats.skipped_no_email}
              </span>
            ) : (
              "Seleziona una comunicazione per vedere il dettaglio destinatari."
            )}
          </div>
        </div>

        <div className="rounded-md border border-barber-gold/20 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-barber-gold/20 hover:bg-transparent">
                <TableHead className="text-barber-paper/80">Giocatore</TableHead>
                <TableHead className="text-barber-paper/80">Email</TableHead>
                <TableHead className="text-barber-paper/80">Stato</TableHead>
                <TableHead className="text-barber-paper/80">Ultimo invio</TableHead>
                <TableHead className="text-barber-paper/80">Errore</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!selectedCommunicationId ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-barber-paper/60">
                    Nessuna comunicazione selezionata.
                  </TableCell>
                </TableRow>
              ) : loadingRecipients ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-barber-paper/60">
                    Caricamento destinatari...
                  </TableCell>
                </TableRow>
              ) : recipients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-barber-paper/60">
                    Nessun destinatario registrato per questa comunicazione.
                  </TableCell>
                </TableRow>
              ) : (
                recipients.map((r) => (
                  <TableRow key={r.id} className="border-barber-gold/10">
                    <TableCell className="text-barber-paper">{r.player_name}</TableCell>
                    <TableCell className="text-barber-paper/80">{r.recipient_email ?? "—"}</TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                    <TableCell className="text-barber-paper/80">
                      {r.sent_at ? new Date(r.sent_at).toLocaleString("it-IT") : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-red-300/90">{r.last_error ?? "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
