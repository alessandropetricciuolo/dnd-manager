"use client";

import { ABILITY_ORDER, type DenseStatblock, type DenseNamedBlock } from "@/lib/manuals/dense-statblock-parser";
import { cn } from "@/lib/utils";

type FiveeStatblockViewProps = {
  data: DenseStatblock;
  className?: string;
};

function StatCell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[9px] font-cinzel font-bold uppercase tracking-wider text-brass-light/80">{label}</div>
      <div className="text-[13px] font-serif font-bold leading-tight text-parchment-100">
        {value}
        {sub ? <span className="ml-1 text-[10px] font-normal text-parchment-400">({sub})</span> : null}
      </div>
    </div>
  );
}

function TraitRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-[11px] leading-snug text-parchment-200">
      <span className="font-cinzel font-bold text-brass-light/90">{label}:</span>{" "}
      <span className="font-serif text-parchment-200">{value}</span>
    </p>
  );
}

/** Rende *corsivo* markdown come span italic; il resto plain. */
function formatInlineMd(text: string) {
  const parts = text.split(/(\*[^*\n]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return (
        <em key={i} className="not-italic text-amber-200/95 font-serif font-semibold">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function NamedBlocks({ title, blocks }: { title: string; blocks: DenseNamedBlock[] }) {
  if (!blocks.length) return null;
  return (
    <section className="mt-3">
      <h3 className="border-b border-brass-base/30 pb-1 font-cinzel text-xs font-bold uppercase tracking-wider text-brass-light">
        {title}
      </h3>
      <div className="mt-1.5 space-y-2 font-serif">
        {blocks.map((b, idx) => (
          <p key={`${b.name}-${idx}`} className="text-[11px] leading-relaxed text-parchment-200">
            {b.name ? (
              <span className="font-bold italic text-parchment-100 not-italic font-cinzel text-[11px] text-amber-300">{b.name}. </span>
            ) : null}
            <span>{formatInlineMd(b.body)}</span>
          </p>
        ))}
      </div>
    </section>
  );
}

function SpellcastingBlocks({ blocks }: { blocks: DenseNamedBlock[] }) {
  if (!blocks.length) return null;
  return (
    <section className="mt-3">
      <h3 className="border-b border-brass-base/30 pb-1 font-cinzel text-xs font-bold uppercase tracking-wider text-brass-light">
        Incantesimi
      </h3>
      <div className="mt-1.5 space-y-2 font-serif">
        {blocks.map((b, idx) => {
          const lines = b.body.split(/\n+/).map((l) => l.trim()).filter(Boolean);
          const prose: string[] = [];
          const list: string[] = [];
          for (const line of lines) {
            if (/^(a volont|trucchetti|\d+[°º]?(\s*livello)?|\d+\s*\/\s*giorno)/i.test(line)) {
              list.push(line);
            } else if (list.length > 0) {
              list.push(line);
            } else {
              prose.push(line);
            }
          }
          return (
            <div key={`${b.name}-${idx}`} className="text-[11px] leading-relaxed text-parchment-200">
              {b.name ? (
                <p className="font-bold font-cinzel text-amber-300">{b.name}.</p>
              ) : null}
              {prose.length > 0 ? (
                <p className="mt-0.5 text-parchment-300">{formatInlineMd(prose.join(" "))}</p>
              ) : null}
              {list.length > 0 ? (
                <ul className="mt-1 space-y-0.5 border-l-2 border-brass-base/40 pl-2">
                  {list.map((line, li) => (
                    <li key={li} className="text-parchment-200">
                      {formatInlineMd(line)}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function FiveeStatblockView({ data, className }: FiveeStatblockViewProps) {
  const abilityKeys = ABILITY_ORDER.filter((k) => data.abilities[k]);

  return (
    <article className={cn("fivee-ref text-[11px] leading-snug text-parchment-200", className)}>
      {/* Testata Monumentale Cremisi & Oro (Mockup) */}
      <header className="mb-2 rounded-t-md bg-gradient-to-r from-[#5a1215] to-[#36090c] p-3 border-b-2 border-amber-600/40 shadow-md">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-cinzel text-lg sm:text-xl font-extrabold uppercase leading-tight tracking-wider text-[#fae5be] drop-shadow">
            {data.name}
          </h2>
          {data.sourceLabel ? (
            <span className="shrink-0 text-[10px] font-medium text-amber-300/90 border border-amber-600/30 px-1.5 py-0.5 rounded bg-black/40">
              {data.sourceLabel}
            </span>
          ) : null}
        </div>
        {data.typeLine ? (
          <p className="mt-1 font-serif text-xs italic text-amber-200/80">{data.typeLine}</p>
        ) : null}
      </header>

      {/* Vitals Summary Strip */}
      <div className="grid grid-cols-5 gap-x-2 gap-y-1 border-y border-brass-base/20 bg-[#16100c] p-2 rounded">
        <StatCell label="CA" value={data.ac ?? "—"} />
        <StatCell label="Init." value={data.initiative ?? "—"} />
        <StatCell label="PF" value={data.hp?.replace(/\s*\(.*\)\s*$/, "") ?? "—"} sub={data.hp?.match(/\(([^)]+)\)/)?.[1]} />
        <StatCell label="Velocità" value={data.speed ?? "—"} />
        <StatCell
          label="Sfida"
          value={data.cr ?? "—"}
          sub={data.xp ? `${data.xp} PE` : undefined}
        />
      </div>

      {/* Nastro Orizzontale Caratteristiche (STR, DEX, CON, INT, WIS, CHA) */}
      {abilityKeys.length > 0 ? (
        <div className="mt-2 grid grid-cols-3 gap-1 rounded border border-brass-base/20 bg-[#18110c] p-2 sm:grid-cols-6">
          {abilityKeys.map((key) => {
            const a = data.abilities[key]!;
            return (
              <div key={key} className="min-w-0 text-center">
                <div className="text-[10px] font-cinzel font-black uppercase text-brass-light">{key}</div>
                <div className="text-[13px] font-serif font-bold text-parchment-100">{a.score}</div>
                <div className="mt-0.5 text-[10px] font-mono text-amber-300 font-semibold">
                  ({a.mod})
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="mt-1.5 space-y-0.5">
        {data.skills ? <TraitRow label="Abilità" value={data.skills} /> : null}
        {data.damageVulnerabilities ? (
          <TraitRow label="Vulnerabilità" value={data.damageVulnerabilities} />
        ) : null}
        {data.damageResistances ? <TraitRow label="Res." value={data.damageResistances} /> : null}
        {data.damageImmunities ? <TraitRow label="Imm. danni" value={data.damageImmunities} /> : null}
        {data.conditionImmunities ? (
          <TraitRow label="Imm." value={data.conditionImmunities} />
        ) : null}
        {data.senses ? <TraitRow label="Sensi" value={data.senses} /> : null}
        {data.languages ? <TraitRow label="Linguaggi" value={data.languages} /> : null}
      </div>

      <NamedBlocks title="Tratti" blocks={data.traits} />
      <SpellcastingBlocks blocks={data.spellcasting} />
      <NamedBlocks title="Azioni" blocks={data.actions} />
      <NamedBlocks title="Azioni bonus" blocks={data.bonusActions} />
      <NamedBlocks title="Reazioni" blocks={data.reactions} />
      <NamedBlocks title="Azioni leggendarie" blocks={data.legendaryActions} />

      {data.parseConfidence === "low" && data.leftoverMarkdown ? (
        <pre className="mt-2 whitespace-pre-wrap border-t border-zinc-800 pt-2 text-[10px] text-zinc-400">
          {data.leftoverMarkdown}
        </pre>
      ) : null}
    </article>
  );
}
