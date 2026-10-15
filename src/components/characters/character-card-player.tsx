"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CampaignCharacterRow } from "@/app/campaigns/character-actions";
import { ImageMediaActions } from "@/components/media/image-media-actions";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatSpellSlotsLabel, parseRulesSnapshot } from "@/lib/character-rules-snapshot";
import type { CharacterRulesSnapshotV1 } from "@/lib/character-rules-snapshot";
import { backgroundBySlug, backgroundRulesTooltipPrefix, raceBySlug } from "@/lib/character-build-catalog";
import { sanitizeRaceTraitsMarkdown } from "@/lib/race-traits-sanitizer";
import { isImageSourceOptimizable } from "@/lib/is-image-optimizable";
import { CharacterSheetPanel } from "./character-sheet-panel";

const PLACEHOLDER_AVATAR = "https://placehold.co/400x560/1c1917/fbbf24/png?text=PG";

const STALE_SNAPSHOT_HINT =
  "Snapshot regole non presente o non aggiornato. Il Master deve aprire «Modifica personaggio» sulla scheda del personaggio in campagna e premere Salva per generare i testi dal Manuale del Giocatore indicizzato. Se hai già salvato, verifica che la migration del database sia applicata e che il manuale non sia escluso nei paletti della campagna.";

type CharacterCardPlayerProps = {
  character: CampaignCharacterRow;
  isLongCampaign?: boolean;
  isTorneoCampaign?: boolean;
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

  return (
    <div className="space-y-1">{nodes}</div>
  );
}

/** Trigger click/tap friendly (desktop + mobile). */
function RulesTip({ label, children }: { label: string; children: string }) {
  const t = children.trim();
  if (!t) {
    return <span className="text-barber-paper/85">{label}</span>;
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          className="cursor-help border-b border-dotted border-barber-gold/55 text-barber-paper/90 outline-none hover:text-barber-gold focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-barber-gold/40"
        >
          {label}
        </span>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        className="max-h-72 w-[min(92vw,36rem)] overflow-y-auto whitespace-pre-wrap border-barber-gold/30 bg-barber-dark px-3 py-2 text-left text-xs leading-relaxed text-barber-paper"
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
          className="cursor-help border-b border-dotted border-barber-gold/55 text-barber-paper/90 outline-none hover:text-barber-gold focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-barber-gold/40"
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

function tooltipOrWarnings(
  md: string | null | undefined,
  snap: CharacterRulesSnapshotV1 | null,
  staleFallback: string | undefined
): string {
  const m = md?.trim();
  if (m) return m;
  const w = snap?.warnings?.filter(Boolean).join("\n\n").trim();
  if (w) return w;
  return staleFallback?.trim() ?? "";
}

/** Versione immersiva per il giocatore: immagine grande, nome, background. Nessun link al PDF. */
export function CharacterCardPlayer({
  character,
  isLongCampaign,
  isTorneoCampaign = false,
}: CharacterCardPlayerProps) {
  const [activeSection, setActiveSection] = useState<"sheet" | "spells" | "equipment" | "story">("sheet");
  const [imgError, setImgError] = useState(false);
  const [forceImageUnoptimized, setForceImageUnoptimized] = useState(false);
  useEffect(() => {
    setImgError(false);
    setForceImageUnoptimized(false);
  }, [character.image_url]);
  const imageSrc = imgError ? PLACEHOLDER_AVATAR : (character.image_url ?? PLACEHOLDER_AVATAR);
  const storedLevel = character.level ?? 1;
  const classLabel = character.character_class?.trim() || "Classe non specificata";
  const classSubclassLabel = character.class_subclass?.trim() || null;
  const raceDef = raceBySlug(character.race_slug ?? null);
  const raceLabel = raceDef?.label ?? null;
  const subraceLabel =
    raceDef?.subraces?.find((s) => s.slug === character.subclass_slug)?.label ?? null;
  const bgEntry = backgroundBySlug(character.background_slug ?? null);
  const bgRulesLabel = bgEntry?.label ?? null;
  const bgRulesBookPrefix = backgroundRulesTooltipPrefix(bgEntry ?? null);
  const snap = parseRulesSnapshot(character.rules_snapshot ?? null);
  const spellSlotsLabel = formatSpellSlotsLabel(snap?.spellSlots);
  const cantripsLabel =
    snap?.cantripsKnown != null && snap.cantripsKnown > 0 ? `${snap.cantripsKnown} trucchetti` : null;

  const hasBuild = !!(
    character.race_slug ||
    character.character_class?.trim() ||
    character.background_slug
  );
  const staleFallback = !snap && hasBuild ? STALE_SNAPSHOT_HINT : undefined;

  const raceBody = sanitizeRaceTraitsMarkdown(
    character.race_slug ?? null,
    tooltipOrWarnings(snap?.raceTraitsMd, snap, staleFallback)
  );
  const showSubrace =
    !!(character.subclass_slug && subraceLabel) || !!snap?.subraceTraitsMd?.trim();
  const raceDisplayLabel = showSubrace ? (subraceLabel ?? "Sottorazza") : raceLabel;
  const raceDisplayBody = showSubrace
    ? tooltipOrWarnings(snap?.subraceTraitsMd, snap, staleFallback)
    : raceBody;
  const classBody = tooltipOrWarnings(snap?.classPrivilegesMd, snap, staleFallback);
  const classSubclassBody = tooltipOrWarnings(snap?.classSubclassMd, snap, staleFallback);
  const spellsBody = tooltipOrWarnings(
    [snap?.spellcastingMd, snap?.spellsListMd].filter(Boolean).join("\n\n"),
    snap,
    staleFallback
  );

  const tabs = [
    { id: "sheet", label: "Scheda" },
    { id: "spells", label: "Incantesimi" },
    { id: "equipment", label: "Equipaggiamento" },
    { id: "story", label: "Storia e tratti" },
  ] as const;

  return (
    <div className="card-guild-stone relative min-w-0 rounded-xl border border-barber-gold/25 p-3 shadow-xl sm:p-5">
      <span className="corner-ornament-tl" />
      <span className="corner-ornament-tr" />
      <span className="corner-ornament-bl" />
      <span className="corner-ornament-br" />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(260px,310px)_minmax(0,1fr)] lg:gap-7">
        <div className="contents lg:block">
          <div className="relative order-1 mx-auto aspect-[4/5] w-full max-w-[310px] overflow-hidden rounded-lg border border-barber-gold/45 bg-barber-dark shadow-lg">
            <Image
              src={imageSrc}
              alt={character.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 400px"
              priority
              unoptimized={forceImageUnoptimized || (!!character.image_url && !isImageSourceOptimizable(character.image_url))}
              onError={() => {
                if (!forceImageUnoptimized && character.image_url && isImageSourceOptimizable(character.image_url)) setForceImageUnoptimized(true);
                else setImgError(true);
              }}
            />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/90 to-transparent p-3 pt-10">
              <span className="shrink-0 rounded border border-barber-gold/55 bg-[#120f0d]/90 px-2 py-1 font-cinzel text-sm text-gold-relief">
                Lv {storedLevel}
              </span>
            </div>
          </div>

          {character.image_url && (
            <div className="order-2 flex justify-end pt-1">
              <ImageMediaActions driveUrl={character.image_url} title={character.name} />
            </div>
          )}

          <div className="order-4 space-y-3">
            {!isTorneoCampaign ? (
              <div className="space-y-1 border-l-2 border-barber-gold/45 bg-black/20 p-3">
                <p className="text-xs font-semibold text-barber-gold">Cronaca temporale</p>
                <p className="text-sm font-medium text-barber-paper">{character.calendar_date_label ?? "Data non impostata"}</p>
                <p className="text-xs text-barber-paper/60 tabular-nums">Tempo vissuto: <strong className="text-barber-paper/85">{character.time_offset_hours ?? 0} ore</strong></p>
              </div>
            ) : null}
            {isLongCampaign ? (
              <div className="space-y-1 border-l-2 border-barber-gold/45 bg-black/20 p-3">
                <p className="text-xs font-semibold text-barber-gold">Borsa del personaggio</p>
                <div className="flex flex-wrap items-center gap-x-2 text-sm font-semibold text-barber-gold tabular-nums">
                  <span>{character.coins_gp ?? "—"} <span className="text-xs font-normal text-barber-paper/70">oro</span></span>
                  <span aria-hidden>·</span>
                  <span>{character.coins_sp ?? "—"} <span className="text-xs font-normal text-barber-paper/70">argento</span></span>
                  <span aria-hidden>·</span>
                  <span>{character.coins_cp ?? "—"} <span className="text-xs font-normal text-barber-paper/70">rame</span></span>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="order-3 min-w-0 space-y-4">
          <div className="border-b border-barber-gold/20 pb-4">
            <h1 className="break-words font-cinzel text-2xl font-bold tracking-wide text-gold-relief sm:text-3xl">
              {character.name}
            </h1>
            <p className="mt-1 text-sm text-barber-paper/65">Livello {storedLevel}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-barber-paper/90">
              {raceDisplayLabel ? (
                <span className="inline-flex items-center rounded-md border border-barber-gold/30 bg-barber-gold/10 px-2.5 py-1 font-medium">
                  <RulesTip label={raceDisplayLabel}>{raceDisplayBody}</RulesTip>
                </span>
              ) : null}

              <span className="inline-flex items-center rounded-md border border-barber-gold/30 bg-barber-gold/10 px-2.5 py-1 font-medium">
                <RulesTip label={classLabel}>{classBody}</RulesTip>
              </span>

              {classSubclassLabel ? (
                <span className="inline-flex items-center rounded-md border border-amber-600/40 bg-amber-950/30 px-2.5 py-1 text-amber-200">
                  <RulesTip label={classSubclassLabel}>{classSubclassBody}</RulesTip>
                </span>
              ) : null}

              {(spellSlotsLabel || cantripsLabel) && (
                <span className="inline-flex items-center rounded border border-barber-gold/25 bg-barber-gold/10 px-2.5 py-1 text-barber-gold">
                  Slot: {[spellSlotsLabel, cantripsLabel].filter(Boolean).join(" · ")}
                </span>
              )}

              {spellsBody ? (
                <span className="inline-flex items-center rounded border border-barber-gold/25 bg-barber-gold/10 px-2.5 py-1 text-barber-gold">
                  <SpellsTip listText={spellsBody} details={snap?.spellsDetailsMd} />
                </span>
              ) : null}
            </div>
          </div>

          <div className="mt-5 border-t border-barber-gold/20 pt-3">
        <div role="tablist" aria-label="Sezioni del personaggio" className="flex gap-1 overflow-x-auto border-b border-barber-gold/20">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeSection === tab.id}
              aria-controls={`character-section-${tab.id}`}
              onClick={() => setActiveSection(tab.id)}
              className={`min-h-11 shrink-0 border-b-2 px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-barber-gold/60 ${activeSection === tab.id ? "border-barber-gold font-semibold text-barber-gold" : "border-transparent text-barber-paper/65 hover:text-barber-paper"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div id={`character-section-${activeSection}`} role="tabpanel" className="pt-4">
          {activeSection === "story" ? (
            <div className="space-y-4">
              <section className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 border-b border-barber-gold/20 pb-2">
                  <h3 className="font-cinzel text-base font-semibold text-barber-gold">Origini e retroscena</h3>
                  {bgRulesLabel ? <span className="text-xs text-barber-paper/70">(<RulesTip label={`${bgRulesBookPrefix}: ${bgRulesLabel}`}>{tooltipOrWarnings(snap?.backgroundRulesMd, snap, staleFallback)}</RulesTip>)</span> : null}
                </div>
                {character.background ? <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-barber-paper/90">{character.background}</p> : <p className="text-sm italic text-barber-paper/55">Nessun retroscena registrato.</p>}
              </section>
              <CharacterSheetPanel character={character} section="story" />
            </div>
          ) : (
            <CharacterSheetPanel character={character} section={activeSection} />
          )}
        </div>
          </div>
        </div>
      </div>
    </div>
  );
}
