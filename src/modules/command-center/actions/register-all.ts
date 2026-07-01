import { registerWorkspaceActions } from "./definitions/workspace.actions";
import { registerGmNoteWrapperActions } from "./definitions/wrappers/gm-note.actions";
import { registerSessionWrapperActions } from "./definitions/wrappers/session.actions";
import { registerWikiWrapperActions } from "./definitions/wrappers/wiki.actions";
import { registerAiProposalActions } from "./definitions/ai-proposal.actions";

let registered = false;

/** Registra tutte le action ufficiali (idempotente). */
export function registerAllActions(): void {
  if (registered) return;
  registerWorkspaceActions();
  registerGmNoteWrapperActions();
  registerSessionWrapperActions();
  registerWikiWrapperActions();
  registerAiProposalActions();
  registered = true;
}

// Side-effect: registrazione al primo import del modulo actions.
registerAllActions();
