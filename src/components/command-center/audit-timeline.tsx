"use client";

import type { AppAuditEventRow } from "@/modules/command-center/types";

const ACTION_LABELS: Record<string, string> = {
  "command.note.create": "Nota creata",
  "command.note.update": "Nota aggiornata",
  "command.link.create": "Collegamento aggiunto",
  "command.link.delete": "Collegamento rimosso",
  "workspace.task.create": "Task creato",
  "workspace.task.update": "Task aggiornato",
  "workspace.task.delete": "Task eliminato",
  "workspace.page.create": "Pagina creata",
  "workspace.page.update": "Pagina aggiornata",
  "workspace.page.delete": "Pagina eliminata",
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
      <p className="text-[11px] font-medium text-barber-gold/75">Cronologia azioni</p>
      <div className="scrollbar-barber-y max-h-48 overflow-y-auto pr-1">
        {events.length === 0 ? (
          <p className="text-xs text-barber-paper/50">Nessuna azione registrata.</p>
        ) : (
          <ul className="space-y-1.5">
            {events.map((event) => (
              <li
                key={event.id}
                className="rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-xs ring-1 ring-inset ring-white/[0.06]"
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
      </div>
    </div>
  );
}
