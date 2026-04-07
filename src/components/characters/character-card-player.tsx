"use client";

import Image from "next/image";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CampaignCharacterRow } from "@/app/campaigns/character-actions";
import { MapPopoutButton } from "@/components/maps/map-popout-button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { parseRulesSnapshot } from "@/lib/character-rules-snapshot";
import type { CharacterRulesSnapshotV1 } from "@/lib/character-rules-snapshot";
import { backgroundBySlug, raceBySlug } from "@/lib/character-build-catalog";

const PLACEHOLDER_AVATAR = "https://placehold.co/400x560/1c1917/fbbf24/png?text=PG";

const STALE_SNAPSHOT_HINT =
  "Snapshot regole non presente o non aggiornato. Il Master deve aprire «Modifica personaggio» sulla scheda del personaggio in campagna e premere Salva per generare i testi dal Manuale del Giocatore indicizzato. Se hai già salvato, verifica che la migration del database sia applicata e che il manuale non sia escluso nei paletti della campagna.";

type CharacterCardPlayerProps = {
  character: CampaignCharacterRow;
  isLongCampaign?: boolean;
};

function renderRichTooltipText(text: string) {
  const cleanInline = (s: string): string =>
    s
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/\*\*/g, "")
      .replace(/^[-*]\s+/, "")
      .trimEnd();
  const lines = text.replace(/\r/g, "").split("\n");
  return (
    <div className="space-y-1">
      {lines.map((raw, idx) => {
        const line = raw.trimEnd();
        const heading = line.match(/^\s*#+\s*(.+)$/);
        if (heading) {
          return (
            <p key={idx} className="font-semibold text-barber-gold">
              {cleanInline(heading[1] ?? "")}
            </p>
          );
        }
        const strong = line.match(/^\s*\*+\s*(.+)$/);
        if (strong) {
          return (
            <p key={idx} className="font-semibold text-barber-paper">
              {cleanInline(strong[1] ?? "")}
            </p>
          );
        }
        return (
          <p key={idx} className="text-barber-paper">
            {cleanInline(line)}
          </p>
        );
      })}
    </div>
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
export function CharacterCardPlayer({ character, isLongCampaign }: CharacterCardPlayerProps) {
  const [imgError, setImgError] = useState(false);
  const imageSrc = imgError ? PLACEHOLDER_AVATAR : (character.image_url ?? PLACEHOLDER_AVATAR);
  const storedLevel = character.level ?? 1;
  const classLabel = character.character_class?.trim() || "Classe non specificata";
  const classSubclassLabel = character.class_subclass?.trim() || null;
  const raceDef = raceBySlug(character.race_slug ?? null);
  const raceLabel = raceDef?.label ?? null;
  const subraceLabel =
    raceDef?.subraces?.find((s) => s.slug === character.subclass_slug)?.label ?? null;
  const bgRulesLabel = backgroundBySlug(character.background_slug ?? null)?.label ?? null;
  const snap = parseRulesSnapshot(character.rules_snapshot ?? null);

  const hasBuild = !!(
    character.race_slug ||
    character.character_class?.trim() ||
    character.background_slug
  );
  const staleFallback = !snap && hasBuild ? STALE_SNAPSHOT_HINT : undefined;

  const raceBody = tooltipOrWarnings(snap?.raceTraitsMd, snap, staleFallback);
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

  return (
      <Card className="overflow-hidden border-barber-gold/40 bg-barber-dark/90 min-w-0">
        <div className="space-y-2 min-w-0">
          <div className="relative aspect-[4/5] w-full max-w-md mx-auto overflow-hidden bg-barber-dark min-w-0">
            <Image
              src={imageSrc}
              alt={character.name}
              fill
              className="object-cover"
              sizes="(max-width: 500px) 100vw, 400px"
              priority
              unoptimized={!!character.image_url}
              onError={() => setImgError(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-barber-dark via-barber-dark/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 min-w-0">
              <h2 className="text-xl font-semibold text-barber-paper break-words md:text-2xl lg:text-3xl">
                {character.name}
              </h2>
              {/* div: non usare <p> qui — i trigger tooltip non possono stare dentro <p> (HTML invalido). */}
              <div className="mt-1 text-sm text-barber-paper/85">
                {raceDisplayLabel ? (
                  <>
                    <RulesTip label={raceDisplayLabel}>{raceDisplayBody}</RulesTip>
                    {" · "}
                  </>
                ) : null}
                <RulesTip label={classLabel}>{classBody}</RulesTip>
                {classSubclassLabel ? (
                  <>
                    {" · "}
                    <RulesTip label={classSubclassLabel}>{classSubclassBody}</RulesTip>
                  </>
                ) : null}
                {" · "}Livello {storedLevel}
                {spellsBody ? (
                  <>
                    {" · "}
                    <SpellsTip listText={spellsBody} details={snap?.spellsDetailsMd} />
                  </>
                ) : null}
                <span className="mt-0.5 block text-xs text-barber-paper/65 tabular-nums">
                  Tempo vissuto: {character.time_offset_hours ?? 0} h
                </span>
                {isLongCampaign && (
                  <span className="mt-0.5 block text-xs text-barber-gold/90 tabular-nums">
                    {character.coins_gp ?? 0} oro · {character.coins_sp ?? 0} arg · {character.coins_cp ?? 0} ram
                  </span>
                )}
              </div>
            </div>
          </div>
          {character.image_url && (
            <div className="flex justify-end px-4">
              <MapPopoutButton imageUrl={character.image_url} title={character.name} />
            </div>
          )}
        </div>
        <CardHeader className="pb-2">
          <CardTitle className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-barber-gold">
            Background
            {bgRulesLabel ? (
              <span className="text-sm font-normal text-barber-paper/70">
                (
                <RulesTip label={`PHB: ${bgRulesLabel}`}>
                  {tooltipOrWarnings(snap?.backgroundRulesMd, snap, staleFallback)}
                </RulesTip>
                )
              </span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 min-w-0">
          {character.background ? (
            <div className="whitespace-pre-wrap break-words text-barber-paper/90 leading-relaxed overflow-hidden">
              {character.background}
            </div>
          ) : (
            <p className="text-barber-paper/50 italic">Nessun background inserito dal Master.</p>
          )}
        </CardContent>
      </Card>
  );
}
