import type { AiInterpreterResult } from "../types/ai-proposal";
import { detectCampaignCreateRequest } from "./campaign-request-detector";
import { detectCharacterCreateRequest } from "./character-request-detector";
import { detectMissionCreateRequest } from "./mission-request-detector";
import { detectRelationshipCreateRequest } from "./relationship-request-detector";
import { detectSessionCreateRequest } from "./session-request-detector";
import { detectSessionCloseRequest } from "./session-close-request-detector";
import {
  detectWikiCreateRequest,
  hasNpcMechanicsParams,
} from "./wiki-request-detector";
import type { WikiMarkdownExtraParams } from "@/lib/ai/wiki-text-generator";

export type DomainFallbackResult = {
  interpreted: AiInterpreterResult;
  detectedExtraParams?: WikiMarkdownExtraParams;
};

function shouldTryFallback(interpreted: AiInterpreterResult): boolean {
  return interpreted.proposals.length === 0 || interpreted.intent_summary === "Parse fallito";
}

export function applyDomainFallbackInterpreter(
  message: string,
  campaignId: string | null,
  recentUserMessages: string[] | undefined,
  interpreted: AiInterpreterResult
): DomainFallbackResult {
  if (!shouldTryFallback(interpreted)) {
    return { interpreted };
  }

  const combinedContext = [...(recentUserMessages ?? []), message].filter(Boolean).join("\n");

  const wikiDetected = campaignId ? detectWikiCreateRequest(combinedContext) : null;
  if (wikiDetected && campaignId) {
    const narrativeOnly =
      wikiDetected.entityType === "npc" && !hasNpcMechanicsParams(wikiDetected.extraParams);
    return {
      detectedExtraParams: wikiDetected.extraParams,
      interpreted: {
        reply: narrativeOnly
          ? `Preparo il profilo narrativo di **${wikiDetected.title}**. Senza livello non genero lo statblock: puoi aggiungerlo in chat (es. «livello 5») e chiedere modifiche.`
          : `Preparo una voce wiki per **${wikiDetected.title}**.`,
        intent_summary: `Creare ${wikiDetected.entityType}: ${wikiDetected.title}`,
        proposals: [
          {
            action_name: "wiki.entity.create",
            input: {
              campaignId,
              title: wikiDetected.title,
              type: wikiDetected.entityType,
              content: "",
              visibility: "public",
            },
            rationale: "Richiesta wiki rilevata dal messaggio",
          },
        ],
      },
    };
  }

  const missionDetected = campaignId ? detectMissionCreateRequest(combinedContext) : null;
  if (missionDetected) {
    return {
      interpreted: {
        reply: `Preparo la missione **${missionDetected.title}** (grado ${missionDetected.grade}) per la bacheca gilda.`,
        intent_summary: `Creare missione: ${missionDetected.title}`,
        proposals: [
          {
            action_name: "mission.create",
            input: {
              campaignId,
              grade: missionDetected.grade,
              title: missionDetected.title,
              committente: missionDetected.committente,
              ubicazione: missionDetected.ubicazione,
              paga: missionDetected.paga,
              urgenza: missionDetected.urgenza,
              description: missionDetected.description,
              pointsReward: missionDetected.pointsReward,
            },
            rationale: "Richiesta missione rilevata dal messaggio",
          },
        ],
      },
    };
  }

  const sessionCloseDetected = campaignId ? detectSessionCloseRequest(combinedContext) : null;
  if (sessionCloseDetected) {
    return {
      interpreted: {
        reply: "Preparo la chiusura sessione con debrief (presenze, XP, riassunto).",
        intent_summary: "Chiudere sessione",
        proposals: [
          {
            action_name: "session.close",
            input: {
              campaignId,
              summary: "",
            },
            rationale: "Richiesta chiusura sessione rilevata dal messaggio",
          },
        ],
      },
    };
  }

  const sessionDetected = campaignId ? detectSessionCreateRequest(combinedContext) : null;
  if (sessionDetected) {
    const when = [sessionDetected.date, sessionDetected.time].filter(Boolean).join(" ore ");
    return {
      interpreted: {
        reply: `Preparo una sessione${when ? ` per **${when}**` : ""}${sessionDetected.chapterTitle ? ` — capitolo «${sessionDetected.chapterTitle}»` : ""}.`,
        intent_summary: `Creare sessione${when ? `: ${when}` : ""}`,
        proposals: [
          {
            action_name: "session.create",
            input: {
              campaignId,
              date: sessionDetected.date,
              time: sessionDetected.time,
              chapterTitle: sessionDetected.chapterTitle,
              location: sessionDetected.location,
              partyName: sessionDetected.partyName,
              maxPlayers: sessionDetected.maxPlayers,
            },
            rationale: "Richiesta programmazione sessione rilevata dal messaggio",
          },
        ],
      },
    };
  }

  const relationshipDetected = campaignId ? detectRelationshipCreateRequest(combinedContext) : null;
  if (relationshipDetected) {
    return {
      interpreted: {
        reply: `Preparo il collegamento **${relationshipDetected.sourceName}** → **${relationshipDetected.targetName}** (${relationshipDetected.label}).`,
        intent_summary: `Relazione: ${relationshipDetected.sourceName} → ${relationshipDetected.targetName}`,
        proposals: [
          {
            action_name: "wiki.relationship.create",
            input: {
              campaignId,
              sourceName: relationshipDetected.sourceName,
              targetName: relationshipDetected.targetName,
              label: relationshipDetected.label,
            },
            rationale: "Richiesta relazione mappa concettuale rilevata dal messaggio",
          },
        ],
      },
    };
  }

  const characterDetected = campaignId ? detectCharacterCreateRequest(combinedContext) : null;
  if (characterDetected) {
    return {
      interpreted: {
        reply: `Preparo il personaggio giocatore **${characterDetected.name}**${characterDetected.characterClass ? ` (${characterDetected.characterClass})` : ""}.`,
        intent_summary: `Creare PG: ${characterDetected.name}`,
        proposals: [
          {
            action_name: "character.create",
            input: {
              campaignId,
              name: characterDetected.name,
              characterClass: characterDetected.characterClass,
              classSubclass: characterDetected.classSubclass,
              level: characterDetected.level,
              raceSlug: characterDetected.raceSlug,
              background: characterDetected.background,
            },
            rationale: "Richiesta personaggio giocatore rilevata dal messaggio",
          },
        ],
      },
    };
  }

  const campaignDetected = detectCampaignCreateRequest(combinedContext);
  if (campaignDetected) {
    return {
      interpreted: {
        reply: `Preparo la campagna **${campaignDetected.title}** (${campaignDetected.type}).`,
        intent_summary: `Creare campagna: ${campaignDetected.title}`,
        proposals: [
          {
            action_name: "campaign.create",
            input: {
              title: campaignDetected.title,
              description: campaignDetected.description,
              type: campaignDetected.type,
              isPublic: false,
            },
            rationale: "Richiesta nuova campagna rilevata dal messaggio",
          },
        ],
      },
    };
  }

  return { interpreted };
}
