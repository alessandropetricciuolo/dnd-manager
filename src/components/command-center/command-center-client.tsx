"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Archive,
  CheckSquare,
  FileText,
  Inbox,
  Link2,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type {
  CommandLinkRow,
  CommandNoteRow,
  CommandNoteStatus,
  WorkspacePageRow,
  WorkspaceTaskRow,
  AppAuditEventRow,
} from "@/modules/command-center/types";
import {
  createCommandLinkAction,
  createCommandNoteAction,
  createWorkspacePageAction,
  createWorkspaceTaskAction,
  deleteCommandLinkAction,
  deleteWorkspacePageAction,
  deleteWorkspaceTaskAction,
  listCommandLinksForNoteAction,
  resolveCommandLinkLabelsAction,
  updateCommandNoteAction,
  updateWorkspacePageAction,
  updateWorkspaceTaskAction,
  listSessionsForCommandCenterAction,
  listWikiEntitiesForCommandCenterAction,
} from "@/modules/command-center/server/actions";
import { COMMAND_LINK_ENTITY_LABELS_IT } from "@/modules/command-center/types/entities";
import { AuditTimeline } from "@/components/command-center/audit-timeline";
import { AiAssistantPanel } from "@/components/command-center/ai-assistant-panel";
import {
  VoiceInterimHint,
  VoiceMicButton,
} from "@/components/command-center/voice-capture-button";
import { buildCommandInputFromVoice } from "@/modules/command-center/voice/command-input-voice";
import { useVoiceDictation } from "@/modules/command-center/voice/use-voice-dictation";

type CenterView = "workspace" | "assistant";

type SidebarTab = "inbox" | "tasks" | "pages";

type CommandCenterClientProps = {
  initialNotes: CommandNoteRow[];
  initialTasks: WorkspaceTaskRow[];
  initialPages: WorkspacePageRow[];
  initialAuditEvents: AppAuditEventRow[];
  campaigns: { id: string; name: string }[];
  initialCampaignId: string | null;
  initialCenterView?: CenterView;
};

const NOTE_STATUS_LABELS: Record<CommandNoteStatus, string> = {
  inbox: "Inbox",
  reviewed: "Revisionata",
  linked: "Collegata",
  converted: "Convertita",
  archived: "Archiviata",
};

const TASK_STATUS_COLUMNS: { id: WorkspaceTaskRow["status"]; label: string }[] = [
  { id: "todo", label: "Da fare" },
  { id: "doing", label: "In corso" },
  { id: "done", label: "Fatto" },
];

export function CommandCenterClient({
  initialNotes,
  initialTasks,
  initialPages,
  initialAuditEvents,
  campaigns,
  initialCampaignId,
  initialCenterView = "workspace",
}: CommandCenterClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("inbox");
  const [notes, setNotes] = useState(initialNotes);
  const [tasks, setTasks] = useState(initialTasks);
  const [pages, setPages] = useState(initialPages);
  const [auditEvents, setAuditEvents] = useState(initialAuditEvents);
  const [centerView, setCenterView] = useState<CenterView>(initialCenterView);
  const [campaignFilter, setCampaignFilter] = useState<string | "all">(
    initialCampaignId ?? "all"
  );
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(
    initialNotes[0]?.id ?? null
  );
  const [selectedPageId, setSelectedPageId] = useState<string | null>(
    initialPages[0]?.id ?? null
  );
  const [captureText, setCaptureText] = useState("");
  const captureVoice = useVoiceDictation({
    language: "it-IT",
    onFinalTranscript: (transcript, durationMs) => {
      const payload = buildCommandInputFromVoice(transcript, { durationMs });
      setCaptureText(transcript);
      handleCapture(transcript, payload);
    },
  });
  const [links, setLinks] = useState<CommandLinkRow[]>([]);
  const [linkLabels, setLinkLabels] = useState<Record<string, string>>({});
  const [sessions, setSessions] = useState<{ id: string; title: string | null; scheduled_at: string }[]>([]);
  const [wikiEntities, setWikiEntities] = useState<{ id: string; name: string; type: string }[]>([]);

  const selectedNote = notes.find((n) => n.id === selectedNoteId) ?? null;
  const selectedPage = pages.find((p) => p.id === selectedPageId) ?? null;

  const setCampaignInUrl = useCallback(
    (campaignId: string | "all") => {
      const params = new URLSearchParams(searchParams.toString());
      if (campaignId === "all") params.delete("campaignId");
      else params.set("campaignId", campaignId);
      router.push(`/command-center?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const setCenterViewInUrl = useCallback(
    (view: CenterView) => {
      const params = new URLSearchParams(searchParams.toString());
      if (view === "assistant") params.set("view", "assistant");
      else params.delete("view");
      router.push(`/command-center?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  function handleCenterViewChange(view: CenterView) {
    setCenterView(view);
    setCenterViewInUrl(view);
  }

  function handleAssistantCampaignChange(campaignId: string | null) {
    const next = campaignId ?? "all";
    setCampaignFilter(next);
    setCampaignInUrl(next);
  }

  useEffect(() => {
    setNotes(initialNotes);
    setTasks(initialTasks);
    setPages(initialPages);
    setAuditEvents(initialAuditEvents);
  }, [initialNotes, initialTasks, initialPages, initialAuditEvents]);

  useEffect(() => {
    if (!selectedNoteId) {
      setLinks([]);
      return;
    }
    void listCommandLinksForNoteAction(selectedNoteId).then((res) => {
      if (res.success && res.data) {
        setLinks(res.data);
        void resolveCommandLinkLabelsAction(res.data).then((labelRes) => {
          if (labelRes.success && labelRes.data) setLinkLabels(labelRes.data);
        });
      }
    });
  }, [selectedNoteId]);

  useEffect(() => {
    const cid = campaignFilter === "all" ? null : campaignFilter;
    if (!cid) {
      setSessions([]);
      setWikiEntities([]);
      return;
    }
    void listSessionsForCommandCenterAction(cid).then((res) => {
      if (res.success && res.data) setSessions(res.data);
    });
    void listWikiEntitiesForCommandCenterAction(cid).then((res) => {
      if (res.success && res.data) setWikiEntities(res.data);
    });
  }, [campaignFilter]);

  useEffect(() => {
    if (captureVoice.error) toast.error(captureVoice.error);
  }, [captureVoice.error]);

  function handleCapture(
    textOverride?: string,
    voicePayload?: ReturnType<typeof buildCommandInputFromVoice>
  ) {
    const text = (textOverride ?? captureText).trim();
    if (!text) return;
    startTransition(async () => {
      const res = await createCommandNoteAction({
        content: text,
        campaignId: campaignFilter === "all" ? null : campaignFilter,
        source: voicePayload?.source ?? "manual",
        transcript: voicePayload?.transcript ?? null,
        language: voicePayload?.language ?? "it",
        inputMetadata: voicePayload?.metadata ? { voice: voicePayload.metadata } : {},
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(voicePayload ? "Idea vocale catturata in inbox" : "Idea catturata in inbox");
      setCaptureText("");
      if (res.data) {
        setNotes((prev) => [res.data!, ...prev]);
        setSelectedNoteId(res.data.id);
        setSidebarTab("inbox");
      }
      router.refresh();
    });
  }

  function handleNoteFieldChange(field: "title" | "content" | "status", value: string) {
    if (!selectedNote) return;
    startTransition(async () => {
      const patch =
        field === "title"
          ? { title: value }
          : field === "content"
            ? { content: value }
            : { status: value as CommandNoteStatus };
      const res = await updateCommandNoteAction(selectedNote.id, patch);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      if (res.data) {
        setNotes((prev) => prev.map((n) => (n.id === res.data!.id ? res.data! : n)));
      }
    });
  }

  function handleAddLink(entityType: string, entityId: string) {
    if (!selectedNote) return;
    startTransition(async () => {
      const res = await createCommandLinkAction({
        noteId: selectedNote.id,
        entityType,
        entityId,
        campaignId: campaignFilter === "all" ? selectedNote.campaign_id : campaignFilter,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("Collegamento aggiunto");
      if (res.data) setLinks((prev) => [res.data!, ...prev]);
      router.refresh();
    });
  }

  function handleDeleteLink(linkId: string) {
    startTransition(async () => {
      const res = await deleteCommandLinkAction(linkId);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      setLinks((prev) => prev.filter((l) => l.id !== linkId));
    });
  }

  function handleTaskStatusChange(taskId: string, status: WorkspaceTaskRow["status"]) {
    startTransition(async () => {
      const res = await updateWorkspaceTaskAction(taskId, { status });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      if (res.data) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? res.data! : t)));
      }
    });
  }

  function handleNewTask() {
    const title = window.prompt("Titolo task:");
    if (!title?.trim()) return;
    startTransition(async () => {
      const res = await createWorkspaceTaskAction({
        title: title.trim(),
        campaignId: campaignFilter === "all" ? null : campaignFilter,
        sourceNoteId: selectedNote?.id ?? null,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("Task creato");
      if (res.data) setTasks((prev) => [res.data!, ...prev]);
      setSidebarTab("tasks");
      router.refresh();
    });
  }

  function handleNewPage() {
    const title = window.prompt("Titolo pagina:");
    if (!title?.trim()) return;
    startTransition(async () => {
      const res = await createWorkspacePageAction({
        title: title.trim(),
        campaignId: campaignFilter === "all" ? null : campaignFilter,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("Pagina creata");
      if (res.data) {
        setPages((prev) => [res.data!, ...prev]);
        setSelectedPageId(res.data.id);
        setSidebarTab("pages");
      }
      router.refresh();
    });
  }

  function handlePageSave(field: "title" | "contentMarkdown", value: string) {
    if (!selectedPage) return;
    startTransition(async () => {
      const patch = field === "title" ? { title: value } : { contentMarkdown: value };
      const res = await updateWorkspacePageAction(selectedPage.id, patch);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      if (res.data) {
        setPages((prev) => prev.map((p) => (p.id === res.data!.id ? res.data! : p)));
      }
    });
  }

  function handleDeleteTask(taskId: string, title: string) {
    if (!window.confirm(`Eliminare il task «${title}»?`)) return;
    startTransition(async () => {
      const res = await deleteWorkspaceTaskAction(taskId);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("Task eliminato");
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      router.refresh();
    });
  }

  function handleDeletePage(pageId: string, title: string) {
    if (!window.confirm(`Eliminare la pagina «${title}»?`)) return;
    startTransition(async () => {
      const res = await deleteWorkspacePageAction(pageId);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("Pagina eliminata");
      setPages((prev) => {
        const next = prev.filter((p) => p.id !== pageId);
        if (selectedPageId === pageId) {
          setSelectedPageId(next[0]?.id ?? null);
        }
        return next;
      });
      router.refresh();
    });
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden">
      <header className="border-b border-barber-gold/20 bg-barber-dark/90 px-4 py-3 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-barber-gold/70">
              GM Workspace
            </p>
            <h1 className="font-serif text-xl font-bold text-barber-paper md:text-2xl">
              Command Center
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-md border border-barber-gold/30 p-0.5">
              <button
                type="button"
                onClick={() => handleCenterViewChange("workspace")}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                  centerView === "workspace"
                    ? "bg-barber-gold/20 text-barber-gold"
                    : "text-barber-paper/60 hover:text-barber-paper"
                )}
              >
                Workspace
              </button>
              <button
                type="button"
                onClick={() => handleCenterViewChange("assistant")}
                className={cn(
                  "flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-colors",
                  centerView === "assistant"
                    ? "bg-barber-gold/20 text-barber-gold"
                    : "text-barber-paper/60 hover:text-barber-paper"
                )}
              >
                <Sparkles className="h-3 w-3" />
                Assistente
              </button>
            </div>
            <Select
              value={campaignFilter}
              onValueChange={(v) => {
                setCampaignFilter(v as string | "all");
                setCampaignInUrl(v as string | "all");
              }}
            >
              <SelectTrigger className="w-[200px] border-barber-gold/30 bg-barber-dark">
                <SelectValue placeholder="Tutte le campagne" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le campagne</SelectItem>
                {campaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className={cn("mt-3 flex flex-col gap-1", centerView === "assistant" && "hidden")}>
          <VoiceInterimHint
            listening={captureVoice.isListening}
            interim={captureVoice.interimTranscript}
            finalPreview={captureVoice.finalTranscript}
          />
          <div className="flex gap-2">
          <Textarea
            value={captureText}
            onChange={(e) => setCaptureText(e.target.value)}
            placeholder="Cattura un'idea in pochi secondi…"
            rows={2}
            disabled={captureVoice.isListening}
            className="min-h-0 flex-1 resize-none border-barber-gold/30 bg-barber-dark/80"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleCapture();
              }
            }}
          />
          <VoiceMicButton voice={captureVoice} disabled={isPending} className="self-end" />
          <Button
            type="button"
            onClick={() => handleCapture()}
            disabled={isPending || !captureText.trim() || captureVoice.isListening}
            className="shrink-0 self-end"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span className="ml-1 hidden sm:inline">Cattura</span>
          </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row lg:overflow-hidden">
        {/* Sidebar sinistra — nascosta in vista assistente */}
        {centerView !== "assistant" ? (
        <aside className="flex w-full flex-col border-b border-barber-gold/20 lg:w-72 lg:border-b-0 lg:border-r">
          <div className="flex border-b border-barber-gold/20">
            {(
              [
                { id: "inbox" as const, label: "Inbox", icon: Inbox },
                { id: "tasks" as const, label: "Task", icon: CheckSquare },
                { id: "pages" as const, label: "Pagine", icon: FileText },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setSidebarTab(id)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors",
                  sidebarTab === id
                    ? "border-b-2 border-barber-gold text-barber-gold"
                    : "text-barber-paper/60 hover:text-barber-paper"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          <ScrollArea className="h-48 lg:h-auto lg:flex-1">
            {sidebarTab === "inbox" && (
              <ul className="divide-y divide-barber-gold/10">
                {notes.length === 0 ? (
                  <li className="p-4 text-center text-sm text-barber-paper/50">Inbox vuota</li>
                ) : (
                  notes.map((note) => (
                    <li key={note.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedNoteId(note.id)}
                        className={cn(
                          "w-full px-3 py-2.5 text-left transition-colors hover:bg-barber-gold/5",
                          selectedNoteId === note.id && "bg-barber-gold/10"
                        )}
                      >
                        <p className="truncate text-sm font-medium text-barber-paper">{note.title}</p>
                        <p className="mt-0.5 truncate text-xs text-barber-paper/50">
                          {NOTE_STATUS_LABELS[note.status]} ·{" "}
                          {new Date(note.updated_at).toLocaleDateString("it-IT")}
                        </p>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}

            {sidebarTab === "tasks" && (
              <div className="p-2">
                <Button type="button" variant="outline" size="sm" className="mb-2 w-full" onClick={handleNewTask}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Nuovo task
                </Button>
                <div className="space-y-3">
                  {TASK_STATUS_COLUMNS.map((col) => (
                    <div key={col.id}>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-barber-gold/70">
                        {col.label}
                      </p>
                      <ul className="space-y-1">
                        {tasks
                          .filter((t) => t.status === col.id)
                          .map((task) => (
                            <li
                              key={task.id}
                              className="rounded-md border border-barber-gold/20 bg-barber-dark/60 px-2 py-1.5 text-sm"
                            >
                              <div className="flex items-start justify-between gap-1">
                                <p className="min-w-0 flex-1 font-medium text-barber-paper">{task.title}</p>
                                <button
                                  type="button"
                                  title="Elimina task"
                                  className="shrink-0 text-barber-paper/40 hover:text-red-400"
                                  onClick={() => handleDeleteTask(task.id, task.title)}
                                  disabled={isPending}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {TASK_STATUS_COLUMNS.filter((c) => c.id !== task.status).map((c) => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    className="text-[10px] text-barber-gold/80 hover:underline"
                                    onClick={() => handleTaskStatusChange(task.id, c.id)}
                                  >
                                    → {c.label}
                                  </button>
                                ))}
                              </div>
                            </li>
                          ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sidebarTab === "pages" && (
              <div className="p-2">
                <Button type="button" variant="outline" size="sm" className="mb-2 w-full" onClick={handleNewPage}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Nuova pagina
                </Button>
                <ul className="divide-y divide-barber-gold/10">
                  {pages.map((page) => (
                    <li key={page.id}>
                      <div
                        className={cn(
                          "flex items-center gap-1 hover:bg-barber-gold/5",
                          selectedPageId === page.id && "bg-barber-gold/10"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedPageId(page.id)}
                          className="min-w-0 flex-1 truncate px-2 py-2 text-left text-sm"
                        >
                          {page.title}
                        </button>
                        <button
                          type="button"
                          title="Elimina pagina"
                          className="shrink-0 px-2 py-2 text-barber-paper/40 hover:text-red-400"
                          onClick={() => handleDeletePage(page.id, page.title)}
                          disabled={isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </ScrollArea>
        </aside>
        ) : null}

        {/* Centro */}
        <main
          className={cn(
            "flex min-h-0 flex-1 flex-col",
            centerView === "assistant"
              ? "overflow-hidden p-3 md:p-4"
              : "min-h-[280px] overflow-auto p-4 md:p-6"
          )}
        >
          {centerView === "assistant" ? (
            <AiAssistantPanel
              campaignId={campaignFilter === "all" ? null : campaignFilter}
              campaigns={campaigns}
              noteId={selectedNote?.id ?? null}
              onCampaignChange={handleAssistantCampaignChange}
              fullBleed
            />
          ) : sidebarTab === "inbox" && selectedNote ? (
            <div className="mx-auto max-w-2xl space-y-4">
              <Input
                value={selectedNote.title}
                onChange={(e) => handleNoteFieldChange("title", e.target.value)}
                className="border-barber-gold/30 bg-barber-dark/80 font-serif text-lg"
              />
              <Select
                value={selectedNote.status}
                onValueChange={(v) => handleNoteFieldChange("status", v)}
              >
                <SelectTrigger className="w-[180px] border-barber-gold/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(NOTE_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                value={selectedNote.content}
                onChange={(e) => handleNoteFieldChange("content", e.target.value)}
                rows={12}
                className="border-barber-gold/30 bg-barber-dark/80 font-mono text-sm"
              />
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleNewTask}>
                  Crea task da nota
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCenterView("assistant")}
                >
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                  Chiedi all&apos;AI
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleNoteFieldChange("status", "archived")}
                >
                  <Archive className="mr-1 h-3.5 w-3.5" />
                  Archivia
                </Button>
              </div>
            </div>
          ) : sidebarTab === "pages" && selectedPage ? (
            <div className="mx-auto max-w-2xl space-y-4">
              <div className="flex items-center justify-between gap-2">
                <Input
                  value={selectedPage.title}
                  onChange={(e) => handlePageSave("title", e.target.value)}
                  className="border-barber-gold/30 bg-barber-dark/80 font-serif text-lg"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-barber-paper/60 hover:text-red-400"
                  onClick={() => handleDeletePage(selectedPage.id, selectedPage.title)}
                  disabled={isPending}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Elimina
                </Button>
              </div>
              <Textarea
                value={selectedPage.content_markdown}
                onChange={(e) => handlePageSave("contentMarkdown", e.target.value)}
                rows={16}
                placeholder="Markdown…"
                className="border-barber-gold/30 bg-barber-dark/80 font-mono text-sm"
              />
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center text-barber-paper/50">
              <Sparkles className="mb-3 h-8 w-8 text-barber-gold/40" />
              <p className="text-sm">Seleziona una nota o una pagina dalla barra laterale.</p>
              <p className="mt-1 text-xs">Usa la cattura rapida in alto per nuove idee.</p>
            </div>
          )}
        </main>

        {/* Destra — collegamenti */}
        {centerView !== "assistant" ? (
        <aside className="w-full border-t border-barber-gold/20 p-4 lg:w-72 lg:border-l lg:border-t-0">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-barber-paper">
            <Link2 className="h-4 w-4 text-barber-gold" />
            Collegamenti
          </div>

          {selectedNote && sidebarTab === "inbox" ? (
            <div className="space-y-3">
              <ul className="space-y-2">
                {links.length === 0 ? (
                  <li className="text-xs text-barber-paper/50">Nessun collegamento</li>
                ) : (
                  links.map((link) => {
                    const key = `${link.entity_type}:${link.entity_id}`;
                    return (
                      <li
                        key={link.id}
                        className="flex items-start justify-between gap-2 rounded-md border border-barber-gold/20 px-2 py-1.5 text-xs"
                      >
                        <div>
                          <span className="text-barber-gold/80">
                            {COMMAND_LINK_ENTITY_LABELS_IT[link.entity_type as keyof typeof COMMAND_LINK_ENTITY_LABELS_IT] ?? link.entity_type}
                          </span>
                          <p className="text-barber-paper">{linkLabels[key] ?? link.entity_id.slice(0, 8)}</p>
                        </div>
                        <button
                          type="button"
                          className="text-barber-paper/40 hover:text-red-400"
                          onClick={() => handleDeleteLink(link.id)}
                        >
                          ×
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>

              {campaignFilter !== "all" || selectedNote.campaign_id ? (
                <div className="space-y-2 border-t border-barber-gold/10 pt-3">
                  <p className="text-xs text-barber-paper/60">Aggiungi collegamento</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => handleAddLink("campaign", campaignFilter === "all" ? selectedNote.campaign_id! : campaignFilter)}
                    disabled={campaignFilter === "all" && !selectedNote.campaign_id}
                  >
                    Campagna corrente
                  </Button>
                  {sessions.slice(0, 5).map((s) => (
                    <Button
                      key={s.id}
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start truncate text-xs"
                      onClick={() => handleAddLink("session", s.id)}
                    >
                      Sessione: {s.title ?? new Date(s.scheduled_at).toLocaleDateString("it-IT")}
                    </Button>
                  ))}
                  {wikiEntities.slice(0, 8).map((w) => (
                    <Button
                      key={w.id}
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start truncate text-xs"
                      onClick={() => handleAddLink(w.type === "lore" ? "lore" : "wiki_page", w.id)}
                    >
                      {w.name} ({w.type})
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-barber-paper/50">
                  Seleziona una campagna nel filtro per collegare sessioni e wiki.
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-barber-paper/50">
              I collegamenti sono disponibili quando selezioni una nota in inbox.
            </p>
          )}

          <div className="mt-6 rounded-lg border border-dashed border-barber-gold/20 p-3">
            <AuditTimeline events={auditEvents} />
          </div>
        </aside>
        ) : null}
      </div>
    </div>
  );
}
