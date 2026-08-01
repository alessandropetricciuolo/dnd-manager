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
      <div className="text-[9px] font-semibold uppercase tracking-wide text-zinc-400">{label}</div>
      <div className="text-[12px] font-semibold leading-tight text-sky-300">
        {value}
        {sub ? <span className="ml-1 text-[10px] font-normal text-zinc-400">({sub})</span> : null}
      </div>
    </div>
  );
}

function TraitRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-[11px] leading-snug text-zinc-200">
      <span className="font-semibold text-zinc-300">{label}</span>{" "}
      <span className="text-zinc-200">{value}</span>
    </p>
  );
}

/** Rende *corsivo* markdown come span italic; il resto plain. */
function formatInlineMd(text: string) {
  const parts = text.split(/(\*[^*\n]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return (
        <em key={i} className="not-italic text-amber-100/95">
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
    <section className="mt-2">
      <h3 className="border-b border-amber-700/50 pb-0.5 font-[family-name:var(--font-serif)] text-[12px] font-bold uppercase tracking-wide text-amber-300">
        {title}
      </h3>
      <div className="mt-1 space-y-1.5">
        {blocks.map((b, idx) => (
          <p key={`${b.name}-${idx}`} className="text-[11px] leading-snug text-zinc-200">
            {b.name ? (
              <span className="font-semibold italic text-zinc-100">{b.name}. </span>
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
    <section className="mt-2">
      <h3 className="border-b border-amber-700/50 pb-0.5 font-[family-name:var(--font-serif)] text-[12px] font-bold uppercase tracking-wide text-amber-300">
        Incantesimi
      </h3>
      <div className="mt-1 space-y-2">
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
            <div key={`${b.name}-${idx}`} className="text-[11px] leading-snug text-zinc-200">
              {b.name ? (
                <p className="font-semibold italic text-zinc-100">{b.name}.</p>
              ) : null}
              {prose.length > 0 ? (
                <p className="mt-0.5 text-zinc-300">{formatInlineMd(prose.join(" "))}</p>
              ) : null}
              {list.length > 0 ? (
                <ul className="mt-1 space-y-0.5 border-l border-amber-700/30 pl-2">
                  {list.map((line, li) => (
                    <li key={li} className="text-zinc-200">
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
    <article className={cn("fivee-ref text-[11px] leading-snug text-zinc-200", className)}>
      <header className="mb-1">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-[family-name:var(--font-serif)] text-[1.15rem] font-bold uppercase leading-none tracking-wide text-amber-300">
            {data.name}
          </h2>
          {data.sourceLabel ? (
            <span className="shrink-0 text-[10px] font-medium text-rose-300/90">{data.sourceLabel}</span>
          ) : null}
        </div>
        {data.typeLine ? (
          <p className="mt-0.5 text-[11px] italic text-zinc-300">{data.typeLine}</p>
        ) : null}
      </header>

      <div className="grid grid-cols-5 gap-x-2 gap-y-1 border-y border-zinc-700/80 py-1.5">
        <StatCell label="CA" value={data.ac ?? "—"} />
        <StatCell label="Init." value={data.initiative ?? "—"} />
        <StatCell label="PF" value={data.hp?.replace(/\s*\(.*\)\s*$/, "") ?? "—"} sub={data.hp?.match(/\(([^)]+)\)/)?.[1]} />
        <StatCell label="Vel." value={data.speed ?? "—"} />
        <StatCell
          label="GS"
          value={data.cr ?? "—"}
          sub={data.xp ? `${data.xp} PE` : undefined}
        />
      </div>

      {abilityKeys.length > 0 ? (
        <div className="mt-1.5 grid grid-cols-3 gap-1 rounded bg-zinc-900/90 p-1.5 sm:grid-cols-6">
          {abilityKeys.map((key) => {
            const a = data.abilities[key]!;
            return (
              <div key={key} className="min-w-0 text-center">
                <div className="text-[9px] font-bold uppercase text-zinc-400">{key}</div>
                <div className="text-[12px] font-semibold text-zinc-100">{a.score}</div>
                <div className="mt-0.5 flex justify-center gap-2 text-[9px] text-zinc-500">
                  <span>
                    MOD <span className="font-semibold text-sky-300">{a.mod}</span>
                  </span>
                  <span>
                    TS <span className="font-semibold text-sky-300">{a.save}</span>
                  </span>
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
