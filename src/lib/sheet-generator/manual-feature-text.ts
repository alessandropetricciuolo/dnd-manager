import { sanitizeTextForStandardPdfFont } from '@/lib/pdf/winansi-text';

export type PrintFeature = { title: string; body: string; level: number; source: string };

export function printPlainText(markdown: string): string {
  return sanitizeTextForStandardPdfFont(markdown.replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/^\s*\|[\s:|\-]+\|\s*$/gm,'')
    .replace(/<\/(?:tr|p)>/gi,'\n').replace(/<\/(?:td|th)>/gi,' | ').replace(/<[^>]+>/g,' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/^#{1,6}\s+/gm,'').replace(/\*|`/g,'')
    .replace(/(?:^|\n)\s*(?:\d{1,3}\s+)?(?:CAPITOLO|PARTE)\s+\d+(?:\s*\|[^\n]*)?(?:\s+\d{1,3})?/gi, ' ')
    .replace(/\b\d{1,3}\s+(?:CAPITOLO|PARTE)\s+\d+\s*\|[^\n]*/gi, ' ')
    .replace(/\b(?:CAPITOLO|PARTE)\s+\d+\s*\|[^\n]*/gi, ' ')
    .replace(/\n\s*\d{1,3}\s*\n/g, '\n')
    .replace(/^(?:img[-_]?\d+\.?\s*(?:jpe?g|png)?|scansionato con camscanner|offrimi un caff[eè][^\n]*|paypal\.me[^\n]*)\s*$/gim, '')
    .replace(/\n{3,}/g,'\n\n').trim());
}

export function normalizeFeatureTitle(s: string) { return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim(); }
export function extractLeveledFeatures(md: string, levels: Record<string, number>, level: number, source: string): PrintFeature[] {
  return md.split(/(?=^#{1,6}\s)/m).flatMap((part) => {
    const m=part.match(/^#{1,6}\s+([^\n]+)\n([\s\S]*)/);
    if(!m) return [];
    const unlock=levels[normalizeFeatureTitle(m[1])];
    if(!unlock || unlock>level) return [];
    // Remove only whole future-unlock paragraphs, preserving the other source sentences verbatim.
    const paragraphs=printPlainText(m[2]).split(/\n\s*\n/).filter((p) => {
      const future=p.match(/^(?:Al|Dal|A partire dal|Quando arriva al)\s+(\d+)[°º]?\s+livello/i);
      return !future || Number(future[1])<=level;
    });
    return paragraphs.join('\n\n').trim() ? [{title:m[1].trim(),body:paragraphs.join('\n\n'),level:unlock,source}] : [];
  });
}

