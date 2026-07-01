"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import type { AppAuditEventRow } from "@/modules/command-center/types";

const ACTION_LABELS: Record<string, string> = {
  "command.note.create": "Nota creata",
  "command.note.update": "Nota aggiornata",
  "command.link.create": "Collegamento aggiunto",
  "command.link.delete": "Collegamento rimosso",
  "workspace.task.create": "Task creato",
  "workspace.task.update": "Task aggiornato",
  "workspace.page.create": "Pagina creata",
  "workspace.page.update": "Pagina aggiornata",
  "gm.note.create": "Nota GM creata",
  "gm.note.update": "Nota GM aggiornata",
  "gm.note.delete": "Nota GM eliminata",
  "session.create": "Sessione creata",
  "session.update": "Sessione aggiornata",
  "session.close": "Sessione chiusa",
  "wiki.entity.create": "Entità wiki creata",
  "wiki.entity.update": "Entità wiki aggiornata",
  "wiki.entity.delete": "Entità wiki eliminata",
  "campaign.create": "Campagna creata",
  "campaign.update": "Campagna aggiornata",
  "mission.create": "Missione creata",
  "mission.update": "Missione aggiornata",
  "character.create": "Personaggio creato",
  "character.update": "Personaggio aggiornato",
  "campaign.aiContext.generate": "Contesto AI generato",
  "memory.reindex": "Memoria reindicizzata",
  "command.input.capture": "Input registrato",
  "ai.proposal.execute": "Bozza AI applicata",
  "ai.proposal.reject": "Bozza AI scartata",
};

type AuditTimelineProps = {
  events: AppAuditEventRow[];
};

export function AuditTimeline({ events }: AuditTimelineProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium uppercase tracking-wide text-barber-gold/70">
        Cronologia azioni
      </p>
      <ScrollArea className="h-48 pr-2">
        {events.length === 0 ? (
          <p className="text-xs text-barber-paper/50">Nessuna azione registrata.</p>
        ) : (
          <ul className="space-y-2">
            {events.map((event) => (
              <li
                key={event.id}
                className="rounded-md border border-barber-gold/15 bg-barber-dark/50 px-2 py-1.5 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-barber-paper">
                    {ACTION_LABELS[event.action_name] ?? event.action_name}
                  </span>
                  <span className="shrink-0 text-[10px] text-barber-paper/40">
                    {new Date(event.created_at).toLocaleString("it-IT", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="mt-0.5 text-barber-paper/50">
                  {event.actor_type === "ai" ? "AI" : event.actor_type === "system" ? "Sistema" : "GM"}
                  {event.entity_type ? ` · ${event.entity_type}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}
