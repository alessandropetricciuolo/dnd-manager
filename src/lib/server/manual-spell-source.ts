import { getManualMarkdownByFileName } from './phb-spell-excerpt';
import type { GeneratedSpell } from '@/lib/sheet-generator/types';

const MANUAL_SPELL_HEADING_ALIASES: Record<string, string[]> = {
  'lenza elettrizzante': ['Lenza Elettrzante', 'Lenza Elettrizzante'],
  'sogno del velo celeste': ['Socno del Velo Celeste', 'Sogno del Velo Celeste'],
  'evoca bestia': ['Evolare Bestia', 'Evoca Bestia'],
  "evoca bestia d'ombra": ["Evocabestia d'Ombra", "Evoca Bestia d'Ombra"],
  'evoca elementali': ['Evoca Elementale', 'Evoca Elementali'],
  'risata incontenibile di tasha': ['Risata Incontrollabile di Tasha', 'Risata Incontenibile di Tasha'],
  'individuazione del bene e del male': ['Individuazione del Male e del Bene', 'Individuazione del Bene e del Male'],
  'protezione dal bene e dal male': ['Protezione dal Male e dal Bene', 'Protezione dal Bene e dal Male'],
  'fiamma perenne': ['Fiamma Continua', 'Fiamma Perenne'],
  'blocco di persone': ['Blocca Persone', 'Blocco di Persone'],
  'blocca persone': ['Blocca Persone', 'Blocco di Persone'],
  'mano magica': ['Mano Magica'],
};

function normLookup(s: string): string {
  return s.toLocaleLowerCase('it').replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
}

/** Exact-title spell reader; school, level and casting metadata must be present in an owned manual. */
export function manualSpellFromSources(
  name: string,
  expectedLevel: number,
  note = '',
  meta: Partial<GeneratedSpell> = {}
): GeneratedSpell {
  const candidates = MANUAL_SPELL_HEADING_ALIASES[normLookup(name)] ?? [name];
  for (const file of ['manuale_giocatore.md', 'xanathar.md', 'Tasha.md']) {
    const text = getManualMarkdownByFileName(file).replace(/[’‘]/g, "'");
    if (!text) continue;
    const marker = text.search(/^# DESCRIZION[EI] DEGLI INCANTESIMI\s*$/m);
    let chapter = marker >= 0 ? text.slice(marker) : text;
    const stopIdx = chapter.search(/^# (?:INCANTESIMI PERSONALIZZATI|APPENDICE [AB]:)/m);
    if (stopIdx > 0) chapter = chapter.slice(0, stopIdx);

    for (const candidate of candidates) {
      const escaped = candidate.replace(/[’‘]/g, "'").replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const h = new RegExp('^(?:#{1,6}\\s+' + escaped + '(?:\\s*\\([^)]*\\))?|\\*\\*' + escaped + '\\*\\*)\\s*$', 'im').exec(chapter);
      if (!h) continue;
      const tail = chapter.slice(h.index + h[0].length);
      const end =
        [
          ...tail.matchAll(
            /^(?:#{1,6}\s+([^\n]+)|\*\*([A-ZÀ-Ü' ]{4,})\*\*(?=\s*\n+\s*(?:#{1,6}\s*)?\*{0,2}(?:Trucchetto|[A-Za-zÀ-ü]+ di \$?[1-9])))/gm
          ),
        ].find((m) => {
          const headingText = (m[1] ?? m[2] ?? '').trim();
          return !/Trucchetto|livello|^(?:Tempo di Lancio|Gittata|Componenti|Durata|Ai Livelli Superiori)/i.test(headingText);
        })?.index ?? -1;
      let raw = chapter.slice(h.index, h.index + h[0].length + (end < 0 ? tail.length : end)).trim();
      const metadata =
        raw
          .slice(h[0].length)
          .split('\n')
          .map((s) => s.replace(/\*/g, '').replace(/^#{1,6}\s*/, '').trim())
          .find(Boolean) ?? '';
      const level = /Trucchetto/i.test(metadata)
        ? 0
        : Number(metadata.match(/\$?(\d+)(?:\s*(?:[°º]|\^\{\\circ\}\$?))?\s*livello/i)?.[1]);
      if (level !== expectedLevel) continue;
      raw = raw
        .replace(/^#{1,6}\s+(?=(?:Tempo di Lancio|Gittata|Componenti|Durata):)/gm, '')
        .replace(/^\*{0,2}(Tempo di Lancio|Gittata|Componenti|Durata):?\*{0,2}:?\s*/gim, '**$1:** ');
      if (!/\*\*Durata:\*\*/i.test(raw) || !raw.includes('**Componenti:**')) continue;
      const components = raw.match(/\*\*Componenti:\*\*\s*([^\n]+)/)?.[1] ?? '';
      const sourceBook =
        file === 'manuale_giocatore.md' ? 'Manuale del Giocatore' : file === 'xanathar.md' ? 'Xanathar' : 'Tasha';
      return {
        name,
        level,
        summary: note,
        fullTextMd: (note ? note + '\n\n' : '') + 'Fonte: ' + sourceBook + '\n\n' + raw,
        ritual: /rituale/i.test(metadata),
        concentration: /\*\*Durata:\*\*\s*Concentrazione/i.test(raw),
        verbal: /\bV\b/.test(components),
        somatic: /\bS\b/.test(components),
        material: /\bM\b/.test(components),
        ...meta,
      };
    }
  }
  throw new Error(`Descrizione e livello non verificati nei manuali per ${name}.`);
}
