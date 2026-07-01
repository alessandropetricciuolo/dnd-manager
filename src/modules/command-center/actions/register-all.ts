import { registerWorkspaceActions } from "./definitions/workspace.actions";
import { registerCommandInputActions } from "./definitions/command-input.actions";
import { registerMemoryActions } from "./definitions/memory.actions";
import { registerGmNoteWrapperActions } from "./definitions/wrappers/gm-note.actions";
import { registerSessionWrapperActions } from "./definitions/wrappers/session.actions";
import { registerWikiWrapperActions } from "./definitions/wrappers/wiki.actions";
import { registerMissionWrapperActions } from "./definitions/wrappers/mission.actions";
import { registerCampaignWrapperActions } from "./definitions/wrappers/campaign.actions";
import { registerCharacterWrapperActions } from "./definitions/wrappers/character.actions";
import { registerAiProposalActions } from "./definitions/ai-proposal.actions";

let registered = false;

/** Registra tutte le action ufficiali (idempotente). */
export function registerAllActions(): void {
  if (registered) return;
  registerWorkspaceActions();
  registerCommandInputActions();
  registerMemoryActions();
  registerGmNoteWrapperActions();
  registerSessionWrapperActions();
  registerWikiWrapperActions();
  registerMissionWrapperActions();
  registerCampaignWrapperActions();
  registerCharacterWrapperActions();
  registerAiProposalActions();
  registered = true;
}

registerAllActions();
