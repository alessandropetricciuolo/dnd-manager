import type { CampaignAiContext } from "@/lib/campaign-ai-context";

/** Contesto narrativo/meccanico dei paletti Architetto (testo + immagini). */
export function buildCampaignContextBlock(ctx: CampaignAiContext | null): string {
  if (!ctx) {
    return "Il Master non ha ancora salvato i paletti AI della campagna; resta coerente con fantasy D&D 5e e con il tono epico/verosimile tipico del gioco.";
  }
  return [
    "Contesto di campagna (rispetta questi paletti):",
    `L'ambientazione ha questo tono: ${ctx.narrative_tone}`,
    `La magia funziona così: ${ctx.magic_level}`,
    `Enfatizza queste meccaniche/regole 5e: ${ctx.mechanics_focus}`,
  ].join("\n");
}

/** Solo informazioni visive per prompt immagine (no meccaniche 5e / gameplay). */
export function buildCampaignVisualContextBlock(ctx: CampaignAiContext | null): string {
  if (!ctx) {
    return "Fantasy D&D setting, medieval-fantasy costumes and architecture, cinematic mood.";
  }
  return [
    "Visual campaign context:",
    `Mood and atmosphere: ${ctx.narrative_tone.trim()}`,
    `Art direction and palette: ${ctx.visual_positive.trim()}`,
  ].join("\n");
}
