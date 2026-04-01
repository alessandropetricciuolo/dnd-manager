"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Bold, Eye, Heading2, Link as LinkIcon, Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  createBulkEmailTemplateAction,
  saveJoinEmailTemplateAction,
  sendBulkEmailTemplateAction,
} from "@/lib/actions/campaign-email-actions";

type BulkTemplate = {
  id: string;
  subject: string;
  body_html: string;
  created_at: string;
};

type CampaignEmailPanelProps = {
  campaignId: string;
  initialJoinEnabled: boolean;
  initialJoinSubject: string;
  initialJoinBodyHtml: string;
  initialBulkTemplates: BulkTemplate[];
};

function toolButtonClass() {
  return "h-8 border-violet-500/30 text-violet-100 hover:bg-violet-500/15";
}

export function CampaignEmailPanel({
  campaignId,
  initialJoinEnabled,
  initialJoinSubject,
  initialJoinBodyHtml,
  initialBulkTemplates,
}: CampaignEmailPanelProps) {
  const htmlRef = useRef<HTMLTextAreaElement | null>(null);
  const [isPending, startTransition] = useTransition();

  const [joinEnabled, setJoinEnabled] = useState(initialJoinEnabled);
  const [joinSubject, setJoinSubject] = useState(initialJoinSubject);
  const [joinBodyHtml, setJoinBodyHtml] = useState(initialJoinBodyHtml);

  const [bulkSubject, setBulkSubject] = useState("");
  const [bulkBodyHtml, setBulkBodyHtml] = useState("<h2>Comunicazione di campagna</h2><p>Scrivi qui il messaggio da inviare ai membri iscritti.</p>");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(initialBulkTemplates[0]?.id ?? "");

  const selectedTemplate = useMemo(
    () => initialBulkTemplates.find((t) => t.id === selectedTemplateId) ?? null,
    [initialBulkTemplates, selectedTemplateId]
  );

  function wrapSelection(prefix: string, suffix = prefix) {
    const textarea = htmlRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const source = bulkBodyHtml;
    const selected = source.slice(start, end);
    const next = `${source.slice(0, start)}${prefix}${selected}${suffix}${source.slice(end)}`;
    setBulkBodyHtml(next);
  }

  function insertAtEnd(html: string) {
    setBulkBodyHtml((prev) => `${prev}\n${html}`);
  }

  function saveJoinTemplate() {
    startTransition(async () => {
      const res = await saveJoinEmailTemplateAction(campaignId, joinEnabled, joinSubject, joinBodyHtml);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success(res.message);
    });
  }

  function saveBulkTemplate() {
    startTransition(async () => {
      const res = await createBulkEmailTemplateAction(campaignId, bulkSubject, bulkBodyHtml);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success(res.message);
      if (res.templateId) setSelectedTemplateId(res.templateId);
      setBulkSubject("");
    });
  }

  function sendSelectedTemplate() {
    if (!selectedTemplateId) {
      toast.error("Seleziona un template da inviare.");
      return;
    }
    startTransition(async () => {
      const res = await sendBulkEmailTemplateAction(campaignId, selectedTemplateId);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success(res.message);
    });
  }

  return (
    <section className="space-y-5 rounded-lg border border-violet-600/30 bg-violet-950/25 p-4">
      <h3 className="text-sm font-medium text-violet-200">Email Campagna Long</h3>

      <div className="rounded-lg border border-violet-500/25 bg-slate-950/50 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-violet-100">1) Mail automatica all&apos;iscrizione</p>
          <label className="inline-flex items-center gap-2 text-xs text-violet-100/90">
            <input
              type="checkbox"
              checked={joinEnabled}
              onChange={(e) => setJoinEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-violet-400/40 bg-slate-950"
            />
            Abilitata
          </label>
        </div>
        <Input
          value={joinSubject}
          onChange={(e) => setJoinSubject(e.target.value)}
          placeholder="Oggetto mail iscrizione"
          className="border-violet-500/30 bg-slate-950 text-violet-50"
        />
        <Textarea
          value={joinBodyHtml}
          onChange={(e) => setJoinBodyHtml(e.target.value)}
          className="min-h-[160px] resize-y border-violet-500/30 bg-slate-950 text-violet-50 font-mono text-xs"
        />
        <div className="rounded-md border border-violet-500/20 bg-black/20 p-3">
          <p className="mb-2 inline-flex items-center gap-2 text-xs uppercase tracking-wide text-violet-200/70">
            <Eye className="h-3.5 w-3.5" />
            Anteprima HTML
          </p>
          <div className="prose prose-invert max-w-none text-sm [&_a]:text-barber-gold" dangerouslySetInnerHTML={{ __html: joinBodyHtml }} />
        </div>
        <Button type="button" onClick={saveJoinTemplate} disabled={isPending} className="bg-violet-600 text-white hover:bg-violet-500">
          <Mail className="mr-2 h-4 w-4" />
          Salva template iscrizione
        </Button>
      </div>

      <div className="rounded-lg border border-violet-500/25 bg-slate-950/50 p-4 space-y-3">
        <p className="text-sm font-medium text-violet-100">2) Mail massiva ai giocatori iscritti</p>
        <Input
          value={bulkSubject}
          onChange={(e) => setBulkSubject(e.target.value)}
          placeholder="Oggetto nuovo template massivo"
          className="border-violet-500/30 bg-slate-950 text-violet-50"
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className={toolButtonClass()} onClick={() => wrapSelection("<strong>", "</strong>")}>
            <Bold className="mr-1 h-4 w-4" /> Bold
          </Button>
          <Button variant="outline" size="sm" className={toolButtonClass()} onClick={() => insertAtEnd("<h2>Titolo sezione</h2>")}>
            <Heading2 className="mr-1 h-4 w-4" /> Heading
          </Button>
          <Button variant="outline" size="sm" className={toolButtonClass()} onClick={() => insertAtEnd('<p><a href="https://barberanddragons.com" target="_blank" rel="noopener noreferrer">Link utile</a></p>')}>
            <LinkIcon className="mr-1 h-4 w-4" /> Link
          </Button>
        </div>
        <Textarea
          ref={htmlRef}
          value={bulkBodyHtml}
          onChange={(e) => setBulkBodyHtml(e.target.value)}
          className="min-h-[160px] resize-y border-violet-500/30 bg-slate-950 text-violet-50 font-mono text-xs"
        />
        <div className="rounded-md border border-violet-500/20 bg-black/20 p-3">
          <p className="mb-2 inline-flex items-center gap-2 text-xs uppercase tracking-wide text-violet-200/70">
            <Eye className="h-3.5 w-3.5" />
            Anteprima HTML
          </p>
          <div className="prose prose-invert max-w-none text-sm [&_a]:text-barber-gold" dangerouslySetInnerHTML={{ __html: bulkBodyHtml }} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={saveBulkTemplate} disabled={isPending} className="bg-violet-600 text-white hover:bg-violet-500">
            <Mail className="mr-2 h-4 w-4" />
            Salva template massivo
          </Button>
          <select
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            className="h-10 min-w-[260px] rounded-md border border-violet-500/30 bg-slate-950 px-3 text-sm text-violet-50"
          >
            <option value="">Seleziona template salvato…</option>
            {initialBulkTemplates.map((t) => (
              <option key={t.id} value={t.id}>
                {new Date(t.created_at).toLocaleString("it-IT")} · {t.subject}
              </option>
            ))}
          </select>
          <Button type="button" variant="outline" onClick={sendSelectedTemplate} disabled={isPending || !selectedTemplateId}>
            <Send className="mr-2 h-4 w-4" />
            Invia massivamente
          </Button>
        </div>
        {selectedTemplate && (
          <div className="rounded-md border border-violet-500/20 bg-black/20 p-3">
            <p className="mb-2 flex items-center gap-2 text-xs text-violet-200/70">
              <Badge variant="outline" className="border-violet-400/40 text-violet-100">
                Template selezionato
              </Badge>
              {selectedTemplate.subject}
            </p>
            <div className="prose prose-invert max-w-none text-sm [&_a]:text-barber-gold" dangerouslySetInnerHTML={{ __html: selectedTemplate.body_html }} />
          </div>
        )}
      </div>
    </section>
  );
}

