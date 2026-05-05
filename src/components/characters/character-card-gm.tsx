"use client";

import Image from "next/image";
import { useRouter } from "nextjs-toploader/app";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Download, Eye, Pencil, Trash2, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { EditCharacterDialog } from "./edit-character-dialog";
import {
  assignCharacter,
  deleteCharacter,
  levelUpCharacter,
  setCharacterExperience,
  type CampaignCharacterRow,
  type EligiblePlayer,
} from "@/app/campaigns/character-actions";
import { calculateLevelProgress } from "@/lib/dnd-constants";
import { Progress } from "@/components/ui/progress";
import { MapPopoutButton } from "@/components/maps/map-popout-button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { forceCharacterTimeSync, setCharacterCalendarOverride } from "@/app/campaigns/character-actions";
import { parseRulesSnapshot } from "@/lib/character-rules-snapshot";
import { backgroundBySlug, raceBySlug } from "@/lib/character-build-catalog";
import { sanitizeRaceTraitsMarkdown } from "@/lib/race-traits-sanitizer";

const PLACEHOLDER_AVATAR = "https://placehold.co/200x280/1c1917/fbbf24/png?text=PG";

type CharacterCardGmProps = {
  character: CampaignCharacterRow;
  eligiblePlayers: EligiblePlayer[];
  isLongCampaign?: boolean;
  autoOpenEdit?: boolean;
};

function renderRichTooltipText(text: string) {
  const cleanInline = (s: string): string =>
    s
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/\*\*/g, "")
      .replace(/^[-*]\s+/, "")
      .trimEnd();
  const stripTags = (s: string): string =>
    cleanInline(
      s
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    );
  const lines = text.replace(/\r/g, "").split("\n");
  const nodes: JSX.Element[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]?.trimEnd() ?? "";
    if (/^\s*<table[\s>]/i.test(line)) {
      const tableLines: string[] = [line];
      i += 1;
      while (i < lines.length) {
        tableLines.push(lines[i] ?? "");
        if (/<\/table>\s*$/i.test(lines[i] ?? "")) {
          i += 1;
          break;
        }
        i += 1;
      }
      const tableHtml = tableLines.join("\n");
      const rowMatches = Array.from(tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi));
      const rows = rowMatches.map((m) => {
        const cells = Array.from(m[1].matchAll(/<(th|td)[^>]*>([\s\S]*?)<\/\1>/gi));
        return cells.map((c) => stripTags(c[2] ?? ""));
      });
      const header = rows.find((r) => r.length > 0) ?? [];
      const body = rows.slice(header.length ? 1 : 0).filter((r) => r.length > 0);
      if (header.length || body.length) {
        nodes.push(
          <div key={`tbl-${i}`} className="overflow-x-auto rounded border border-barber-gold/20">
            <table className="min-w-full border-collapse text-[11px]">
              {header.length ? (
                <thead className="bg-barber-gold/10 text-barber-gold">
                  <tr>
                    {header.map((h, hIdx) => (
                      <th key={`h-${hIdx}`} className="border-b border-barber-gold/20 px-2 py-1 text-left font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
              ) : null}
              {body.length ? (
                <tbody>
                  {body.map((row, rIdx) => (
                    <tr key={`r-${rIdx}`} className="border-t border-barber-gold/10">
                      {row.map((cell, cIdx) => (
                        <td key={`c-${rIdx}-${cIdx}`} className="px-2 py-1 text-barber-paper/95">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              ) : null}
            </table>
          </div>
        );
      }
      continue;
    }

    const heading = line.match(/^\s*#+\s*(.+)$/);
    if (heading) {
      nodes.push(
        <p key={`ln-${i}`} className="font-semibold text-barber-gold">
          {cleanInline(heading[1] ?? "")}
        </p>
      );
      i += 1;
      continue;
    }
    const listItem = line.match(/^\s*\*\s+(\S.*)$/);
    if (listItem) {
      nodes.push(
        <p key={`ln-${i}`} className="flex gap-2 text-barber-paper">
          <span className="shrink-0 text-barber-gold/85" aria-hidden>
            •
          </span>
          <span className="min-w-0">{cleanInline(listItem[1] ?? "")}</span>
        </p>
      );
      i += 1;
      continue;
    }
    const leadBold = line.match(/^\s*\*\*([^*]+)\*\*\s*(.*)$/);
    if (leadBold) {
      const rest = [leadBold[1], leadBold[2]].filter(Boolean).join(" ").trim();
      nodes.push(
        <p key={`ln-${i}`} className="font-semibold text-barber-paper">
          {cleanInline(rest)}
        </p>
      );
      i += 1;
      continue;
    }
    nodes.push(
      <p key={`ln-${i}`} className="text-barber-paper">
        {cleanInline(line)}
      </p>
    );
    i += 1;
  }

  return <div className="space-y-1">{nodes}</div>;
}

function RulesTip({ label, body }: { label: string; body: string }) {
  const t = body.trim();
  if (!t) return <span className="text-barber-paper/80">{label}</span>;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          className="cursor-help border-b border-dotted border-barber-gold/50 text-barber-paper/90 hover:text-barber-gold"
        >
          {label}
        </span>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        className="max-h-72 w-[min(92vw,34rem)] overflow-y-auto whitespace-pre-wrap border-barber-gold/30 bg-barber-dark px-3 py-2 text-xs leading-relaxed text-barber-paper"
      >
        {renderRichTooltipText(t)}
      </PopoverContent>
    </Popover>
  );
}

function SpellsTip({
  listText,
  details,
}: {
  listText: string;
  details: Record<string, string> | null | undefined;
}) {
  const txt = listText.trim();
  if (!txt) return null;
  const detailMap = details ?? {};
  const parseLines = txt.replace(/\r/g, "").split("\n");
  const normalize = (s: string) => s.trim().toLocaleLowerCase("it");
  const detailByNorm = new Map<string, { label: string; body: string }>(
    Object.entries(detailMap).map(([k, v]) => [normalize(k), { label: k, body: v }])
  );

  const renderedRows = parseLines.map((raw, idx) => {
    const line = raw.trim();
    if (!line) return <div key={`sp-empty-${idx}`} className="h-1" />;
    if (/^#{1,6}\s+/.test(line)) {
      return (
        <p key={`sp-h-${idx}`} className="font-semibold text-barber-gold">
          {line.replace(/^#{1,6}\s+/, "")}
        </p>
      );
    }
    const hit = detailByNorm.get(normalize(line));
    if (!hit) {
      return (
        <p key={`sp-t-${idx}`} className="text-barber-paper">
          {line}
        </p>
      );
    }
    return (
      <details key={`sp-d-${idx}`} className="rounded border border-barber-gold/20 bg-black/20 p-1.5">
        <summary className="cursor-pointer text-barber-gold/90">{hit.label}</summary>
        <div className="mt-2 text-barber-paper/90">{renderRichTooltipText(hit.body)}</div>
      </details>
    );
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          className="cursor-help border-b border-dotted border-barber-gold/50 text-barber-paper/90 hover:text-barber-gold"
        >
          Incantesimi
        </span>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        className="max-h-[75vh] w-[min(95vw,40rem)] overflow-y-auto border-barber-gold/30 bg-barber-dark px-3 py-2 text-left text-xs leading-relaxed text-barber-paper"
      >
        <div className="space-y-1">{renderedRows}</div>
      </PopoverContent>
    </Popover>
  );
}

export function CharacterCardGm({ character, eligiblePlayers, isLongCampaign, autoOpenEdit = false }: CharacterCardGmProps) {
  const router = useRouter();
  const [assigning, setAssigning] = useState(false);
  const [assignedTo, setAssignedTo] = useState<string | null>(character.assigned_to);
  const [deleting, setDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [sheetImgError, setSheetImgError] = useState(false);
  const [isLeveling, startTransition] = useTransition();
  const [isSavingXp, startXpTransition] = useTransition();
  const [epochOpen, setEpochOpen] = useState(false);
  const [epochDraft, setEpochDraft] = useState(String(character.time_offset_hours ?? 0));
  const [epochSaving, setEpochSaving] = useState(false);
  const [calendarYearDraft, setCalendarYearDraft] = useState(String(character.calendar_current_date?.year ?? 1));
  const [calendarMonthDraft, setCalendarMonthDraft] = useState(String(character.calendar_current_date?.month ?? 1));
  const [calendarDayDraft, setCalendarDayDraft] = useState(String(character.calendar_current_date?.day ?? 1));
  const [xpDraft, setXpDraft] = useState(String(character.current_xp ?? 0));
  const imageSrc = imgError ? PLACEHOLDER_AVATAR : character.image_url ?? PLACEHOLDER_AVATAR;
  const sheetImageSrc = sheetImgError
    ? PLACEHOLDER_AVATAR
    : character.image_url ?? PLACEHOLDER_AVATAR;

  const currentLabel = assignedTo
    ? eligiblePlayers.find((p) => p.id === assignedTo)?.label ?? "Assegnato"
    : "Non assegnato";

  const xp = character.current_xp ?? 0;
  const storedLevel = character.level ?? 1;
  const { level: calculatedLevel, nextLevelXp, progressPercent } = calculateLevelProgress(xp);
  const hasLevelUp = calculatedLevel > storedLevel;

  const xpLabel =
    nextLevelXp != null ? `${xp} / ${nextLevelXp} PE` : `${xp} PE (livello massimo)`;
  const classLabel = character.character_class?.trim() || "—";
  const hpLabel = character.hit_points != null ? String(character.hit_points) : "—";
  const acLabel = character.armor_class != null ? String(character.armor_class) : "—";
  const epochHours = character.time_offset_hours ?? 0;
  const calendarLabel = character.calendar_date_label ?? "Data non impostata";

  const backgroundPreview = character.background?.trim() ?? "";
  const backgroundForSheet = character.background?.trim()
    ? character.background
    : null;
  const snap = parseRulesSnapshot(character.rules_snapshot ?? null);
  const raceDef = raceBySlug(character.race_slug ?? null);
  const raceLabel = raceDef?.label ?? null;
  const subraceLabel = raceDef?.subraces?.find((s) => s.slug === character.subclass_slug)?.label ?? null;
  const raceTraitsBody = sanitizeRaceTraitsMarkdown(character.race_slug ?? null, snap?.raceTraitsMd ?? "");
  const bgRulesLabel = backgroundBySlug(character.background_slug ?? null)?.label ?? null;

  useEffect(() => {
    if (autoOpenEdit) setEditOpen(true);
  }, [autoOpenEdit]);

  useEffect(() => {
    setXpDraft(String(character.current_xp ?? 0));
  }, [character.current_xp]);

  async function onAssign(playerId: string | null) {
    const value = playerId === "__none__" ? null : playerId;
    setAssigning(true);
    try {
      const result = await assignCharacter(character.id, value);
      if (result.success) {
        setAssignedTo(value);
        toast.success(value ? "Personaggio assegnato." : "Assegnazione rimossa.");
      } else {
        toast.error(result.error);
      }
    } finally {
      setAssigning(false);
    }
  }

  async function onDelete() {
    if (!confirm(`Eliminare il personaggio "${character.name}"? Anche il PDF della scheda verrà rimosso.`))
      return;
    setDeleting(true);
    try {
      const result = await deleteCharacter(character.id);
      if (result.success) {
        toast.success("Personaggio eliminato.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } finally {
      setDeleting(false);
    }
  }

  async function onEpochSync() {
    const n = parseInt(epochDraft, 10);
    if (Number.isNaN(n) || n < 0) {
      toast.error("Inserisci un numero di ore valido (≥ 0).");
      return;
    }
    setEpochSaving(true);
    try {
      const result = await forceCharacterTimeSync(character.id, n);
      if (result.success) {
        toast.success(result.message);
        setEpochOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } finally {
      setEpochSaving(false);
    }
  }

  async function onCalendarOverride() {
    const year = Number.parseInt(calendarYearDraft, 10);
    const month = Number.parseInt(calendarMonthDraft, 10);
    const day = Number.parseInt(calendarDayDraft, 10);
    if ([year, month, day].some((value) => Number.isNaN(value) || value < 1)) {
      toast.error("Inserisci una data valida (giorno, mese, anno >= 1).");
      return;
    }
    setEpochSaving(true);
    try {
      const result = await setCharacterCalendarOverride(character.id, { year, month, day });
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } finally {
      setEpochSaving(false);
    }
  }

  return (
    <>
      <Card className="relative overflow-hidden border-barber-gold/40 bg-barber-dark/80">
        {/* Azioni compatte in alto a destra */}
        <div className="absolute right-2 top-2 z-[1] flex items-center gap-0.5">
          {character.sheet_url && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-barber-gold hover:bg-barber-gold/15"
              asChild
              title="Scarica scheda PDF"
            >
              <a href={character.sheet_url} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4" />
              </a>
            </Button>
          )}
          {character.image_url && (
            <MapPopoutButton
              imageUrl={character.image_url}
              title={character.name}
              compact
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-barber-gold"
            />
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-barber-paper/80 hover:bg-barber-gold/10"
            disabled={deleting}
            onClick={onDelete}
            title="Elimina personaggio"
          >
            <Trash2 className="h-4 w-4 text-barber-red/90" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-barber-paper/80 hover:bg-barber-gold/10"
            onClick={() => setEditOpen(true)}
            title="Modifica personaggio"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Popover
            open={epochOpen}
            onOpenChange={(o) => {
              setEpochOpen(o);
              if (o) {
                setEpochDraft(String(character.time_offset_hours ?? 0));
                setCalendarYearDraft(String(character.calendar_current_date?.year ?? 1));
                setCalendarMonthDraft(String(character.calendar_current_date?.month ?? 1));
                setCalendarDayDraft(String(character.calendar_current_date?.day ?? 1));
              }
            }}
          >
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-amber-400/90 hover:bg-amber-500/15"
                title="Epoch: ore vissute (sincronizza)"
                type="button"
              >
                <Clock className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-72 border-barber-gold/30 bg-barber-dark text-barber-paper"
              align="end"
            >
              <p className="mb-2 text-xs font-medium text-barber-gold">Timeline personaggio</p>
              <p className="mb-3 text-sm text-barber-paper/80">
                Ore attuali: <span className="font-semibold tabular-nums text-barber-paper">{epochHours}</span>
              </p>
              <p className="mb-3 text-xs text-barber-paper/70">
                Data fantasy attuale: <span className="font-semibold text-amber-200">{calendarLabel}</span>
              </p>
              <label className="mb-1 block text-xs text-barber-paper/70">Nuovo valore (sovrascrive)</label>
              <Input
                type="number"
                min={0}
                value={epochDraft}
                onChange={(e) => setEpochDraft(e.target.value)}
                className="mb-3 border-barber-gold/30 bg-barber-dark/80 text-barber-paper"
              />
              <Button
                type="button"
                size="sm"
                className="w-full bg-amber-600 text-white hover:bg-amber-500"
                disabled={epochSaving}
                onClick={() => void onEpochSync()}
              >
                {epochSaving ? "Salvataggio…" : "Sincronizza tempo"}
              </Button>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <Input
                  type="number"
                  min={1}
                  value={calendarDayDraft}
                  onChange={(e) => setCalendarDayDraft(e.target.value)}
                  className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper"
                  placeholder="Giorno"
                />
                <Input
                  type="number"
                  min={1}
                  value={calendarMonthDraft}
                  onChange={(e) => setCalendarMonthDraft(e.target.value)}
                  className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper"
                  placeholder="Mese"
                />
                <Input
                  type="number"
                  min={1}
                  value={calendarYearDraft}
                  onChange={(e) => setCalendarYearDraft(e.target.value)}
                  className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper"
                  placeholder="Anno"
                />
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-2 w-full border-barber-gold/40 text-barber-gold hover:bg-barber-gold/10"
                disabled={epochSaving}
                onClick={() => void onCalendarOverride()}
              >
                Imposta override data
              </Button>
            </PopoverContent>
          </Popover>
        </div>

        <CardContent className="space-y-3 p-3 pt-10">
          <div className="flex gap-3">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-barber-dark ring-1 ring-barber-gold/25">
              <Image
                src={imageSrc}
                alt={character.name}
                fill
                className="object-cover"
                sizes="80px"
                unoptimized={!!character.image_url}
                onError={() => setImgError(true)}
              />
            </div>
            <div className="min-w-0 flex-1 pr-10">
              <h3 className="truncate font-semibold text-barber-paper">{character.name}</h3>
              <div className="mt-0.5 min-h-4 text-[10px] leading-tight text-barber-paper/75 sm:text-[11px]">
                {raceLabel ? (
                  <>
                    <RulesTip
                      label={subraceLabel ?? raceLabel}
                      body={subraceLabel ? (snap?.subraceTraitsMd ?? "") : raceTraitsBody}
                    />
                    {" · "}
                  </>
                ) : null}
                <RulesTip label={classLabel} body={snap?.classPrivilegesMd ?? ""} />
                {character.class_subclass?.trim() ? (
                  <>
                    {" · "}
                    <RulesTip
                      label={character.class_subclass.trim()}
                      body={snap?.classSubclassMd ?? ""}
                    />
                  </>
                ) : null}
                {snap?.spellcastingMd || snap?.spellsListMd ? (
                  <>
                    {" · "}
                    <SpellsTip
                      listText={[snap?.spellcastingMd, snap?.spellsListMd].filter(Boolean).join("\n\n")}
                      details={snap?.spellsDetailsMd}
                    />
                  </>
                ) : null}
                {bgRulesLabel ? (
                  <>
                    {" · "}
                    <RulesTip label={`PHB: ${bgRulesLabel}`} body={snap?.backgroundRulesMd ?? ""} />
                  </>
                ) : null}
              </div>
              <dl className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px] text-barber-paper/75 sm:text-xs">
                <div className="flex justify-between gap-1">
                  <dt className="text-muted-foreground">Classe</dt>
                  <dd className="truncate font-medium tabular-nums text-barber-paper">{classLabel}</dd>
                </div>
                <div className="flex justify-between gap-1">
                  <dt className="text-muted-foreground">PF</dt>
                  <dd className="font-medium tabular-nums text-barber-paper">{hpLabel}</dd>
                </div>
                <div className="flex justify-between gap-1">
                  <dt className="text-muted-foreground">CA</dt>
                  <dd className="font-medium tabular-nums text-barber-paper">{acLabel}</dd>
                </div>
                <div className="flex justify-between gap-1">
                  <dt className="text-muted-foreground">Lv</dt>
                  <dd className="font-medium tabular-nums text-barber-paper">{storedLevel}</dd>
                </div>
                <div className="col-span-2 flex justify-between gap-1 border-t border-barber-gold/10 pt-0.5">
                  <dt className="text-muted-foreground">Ore (epoch)</dt>
                  <dd className="font-medium tabular-nums text-amber-200/90">{epochHours}</dd>
                </div>
                <div className="col-span-2 flex justify-between gap-1">
                  <dt className="text-muted-foreground">Data fantasy</dt>
                  <dd className="font-medium text-amber-200/90">{calendarLabel}</dd>
                </div>
                {isLongCampaign && (
                  <div className="col-span-2 flex flex-col gap-0.5 border-t border-barber-gold/10 pt-1">
                    <dt className="text-[10px] text-muted-foreground">Monete</dt>
                    <dd className="text-[11px] font-medium tabular-nums text-barber-gold/95">
                      {character.coins_gp ?? 0} oro · {character.coins_sp ?? 0} arg · {character.coins_cp ?? 0} ram
                    </dd>
                  </div>
                )}
              </dl>
              <p className="mt-1 text-[10px] text-barber-paper/55 tabular-nums">{xpLabel}</p>
            </div>
          </div>

          {backgroundPreview ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">{character.background}</p>
          ) : (
            <p className="line-clamp-2 text-sm italic text-muted-foreground">Nessun background.</p>
          )}

          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full border-barber-gold/30 bg-barber-gold/15 text-barber-paper hover:bg-barber-gold/25"
            onClick={() => setDetailsOpen(true)}
          >
            <Eye className="mr-2 h-4 w-4" />
            Dettagli
          </Button>

          <div className="space-y-1.5">
            <label className="text-[10px] font-medium uppercase tracking-wide text-barber-paper/60">
              Assegna a
            </label>
            <Select
              value={assignedTo ?? "__none__"}
              onValueChange={onAssign}
              disabled={assigning}
            >
              <SelectTrigger className="h-9 border-barber-gold/30 bg-barber-dark text-barber-paper text-sm">
                <SelectValue placeholder="Seleziona giocatore" />
              </SelectTrigger>
              <SelectContent className="border-barber-gold/30 bg-barber-dark">
                <SelectItem value="__none__" className="text-barber-paper focus:bg-barber-gold/20">
                  Nessuno
                </SelectItem>
                {eligiblePlayers.map((p) => (
                  <SelectItem
                    key={p.id}
                    value={p.id}
                    className="text-barber-paper focus:bg-barber-gold/20"
                  >
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="truncate text-[10px] text-barber-paper/50">{currentLabel}</p>
          </div>

          <div className="space-y-1.5 rounded-md border border-barber-gold/35 bg-barber-dark/70 p-2">
            <div className="flex items-center justify-between text-[10px] font-medium text-barber-paper/80">
              <span>PE</span>
              <span>
                Lv {storedLevel}
                {hasLevelUp && (
                  <span className="ml-1.5 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-300">
                    Level up
                  </span>
                )}
              </span>
            </div>
            <Progress value={progressPercent} className="h-1.5" />
            <div className="flex items-center justify-between text-[10px] text-barber-paper/65">
              <span className="tabular-nums">{xpLabel}</span>
              <span className="tabular-nums">{Math.round(progressPercent)}%</span>
            </div>
            <div className="flex items-center gap-1.5 pt-1">
              <Input
                type="number"
                min={0}
                value={xpDraft}
                onChange={(event) => setXpDraft(event.target.value)}
                className="h-7 border-barber-gold/30 bg-barber-dark text-[11px] tabular-nums text-barber-paper"
                disabled={isSavingXp}
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-7 border-barber-gold/40 bg-barber-gold/15 px-2 text-[10px] text-barber-paper hover:bg-barber-gold/25"
                disabled={isSavingXp || !assignedTo}
                onClick={() =>
                  startXpTransition(async () => {
                    const parsed = Number.parseInt(xpDraft.trim(), 10);
                    if (!Number.isFinite(parsed) || parsed < 0) {
                      toast.error("Inserisci PE validi (numero intero >= 0).");
                      return;
                    }
                    const result = await setCharacterExperience(character.id, parsed);
                    if (result.success) {
                      toast.success(result.message);
                      router.refresh();
                    } else {
                      toast.error(result.error);
                    }
                  })
                }
              >
                {isSavingXp ? "Salvataggio..." : "Salva PE"}
              </Button>
            </div>
            {!assignedTo ? (
              <p className="text-[10px] text-barber-paper/55">Assegna prima il PG a un giocatore per modificare i PE.</p>
            ) : null}
            {hasLevelUp && (
              <Button
                type="button"
                size="sm"
                className="h-7 w-full bg-emerald-600 text-[11px] text-barber-dark hover:bg-emerald-500"
                disabled={isLeveling}
                onClick={() =>
                  startTransition(async () => {
                    const result = await levelUpCharacter(character.id);
                    if (result.success) {
                      toast.success("Level up confermato.");
                      router.refresh();
                    } else {
                      toast.error(result.error);
                    }
                  })
                }
              >
                {isLeveling ? "Aggiornamento..." : "Conferma level up"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {detailsOpen && (
        <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
          <SheetContent
            side="right"
            className="flex h-full max-h-[100dvh] w-full max-w-lg flex-col overflow-hidden border-barber-gold/40 bg-barber-dark text-barber-paper sm:max-w-lg"
          >
          <SheetHeader className="shrink-0 space-y-1 text-left">
            <SheetTitle className="text-barber-paper">Scheda di lettura — {character.name}</SheetTitle>
            <SheetDescription className="text-barber-paper/65">
              Solo consultazione. Per modificare usa &quot;Modifica&quot; sulla card.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 shrink-0 space-y-4 border-b border-barber-gold/25 pb-4">
            <div className="relative mx-auto aspect-[4/5] w-full max-w-[220px] overflow-hidden rounded-lg bg-barber-dark ring-1 ring-barber-gold/30">
              <Image
                src={sheetImageSrc}
                alt={character.name}
                fill
                className="object-cover"
                sizes="220px"
                unoptimized={!!character.image_url}
                onError={() => setSheetImgError(true)}
              />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-barber-paper">{character.name}</h2>
              <p className="text-sm text-muted-foreground">Assegnato: {currentLabel}</p>
              <div className="mt-1 text-xs text-barber-paper/80">
                {raceLabel ? (
                  <>
                    <RulesTip label={subraceLabel ?? raceLabel} body={subraceLabel ? (snap?.subraceTraitsMd ?? "") : raceTraitsBody} />
                    {" · "}
                  </>
                ) : null}
                <RulesTip label={classLabel} body={snap?.classPrivilegesMd ?? ""} />
                {character.class_subclass?.trim() ? (
                  <>
                    {" · "}
                    <RulesTip label={character.class_subclass.trim()} body={snap?.classSubclassMd ?? ""} />
                  </>
                ) : null}
                {snap?.spellcastingMd || snap?.spellsListMd ? (
                  <>
                    {" · "}
                    <SpellsTip
                      listText={[snap?.spellcastingMd, snap?.spellsListMd].filter(Boolean).join("\n\n")}
                      details={snap?.spellsDetailsMd}
                    />
                  </>
                ) : null}
                {bgRulesLabel ? (
                  <>
                    {" · "}
                    <RulesTip label={`PHB: ${bgRulesLabel}`} body={snap?.backgroundRulesMd ?? ""} />
                  </>
                ) : null}
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <div className="rounded-md border border-barber-gold/25 bg-barber-dark/80 px-2 py-1.5">
                <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Classe</dt>
                <dd className="font-medium tabular-nums text-barber-paper">{classLabel}</dd>
              </div>
              <div className="rounded-md border border-barber-gold/25 bg-barber-dark/80 px-2 py-1.5">
                <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">PF</dt>
                <dd className="font-medium tabular-nums text-barber-paper">{hpLabel}</dd>
              </div>
              <div className="rounded-md border border-barber-gold/25 bg-barber-dark/80 px-2 py-1.5">
                <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">CA</dt>
                <dd className="font-medium tabular-nums text-barber-paper">{acLabel}</dd>
              </div>
              <div className="rounded-md border border-barber-gold/25 bg-barber-dark/80 px-2 py-1.5">
                <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Livello</dt>
                <dd className="font-medium tabular-nums text-barber-paper">{storedLevel}</dd>
              </div>
            </dl>
            <div className="rounded-md border border-barber-gold/30 bg-barber-dark/70 p-2 text-xs text-barber-paper/80">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Punti esperienza</span>
                <span className="tabular-nums font-medium">{xpLabel}</span>
              </div>
              <Progress value={progressPercent} className="mt-2 h-1.5" />
              <p className="mt-1 text-right text-[10px] text-muted-foreground">
                Progresso livello: {Math.round(progressPercent)}%
              </p>
            </div>
          </div>

          <div className="mt-4 flex min-h-0 flex-1 flex-col pb-[env(safe-area-inset-bottom)]">
            <p className="mb-2 shrink-0 text-xs font-medium uppercase tracking-wide text-barber-paper/60">
              Background / Lore
            </p>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-md border border-barber-gold/25 p-3 [-webkit-overflow-scrolling:touch]">
              {backgroundForSheet ? (
                <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-barber-paper/90">
                  {backgroundForSheet}
                </div>
              ) : (
                <p className="text-sm italic text-muted-foreground">Nessun background inserito.</p>
              )}
            </div>
          </div>
          </SheetContent>
        </Sheet>
      )}

      {editOpen && (
        <EditCharacterDialog
          character={character}
          open={editOpen}
          onOpenChange={setEditOpen}
          isLongCampaign={Boolean(isLongCampaign)}
        />
      )}
    </>
  );
}
