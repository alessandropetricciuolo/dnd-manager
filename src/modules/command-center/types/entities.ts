import type { CommandLinkEntityType } from "./workspace";

export const COMMAND_LINK_ENTITY_LABELS_IT: Record<CommandLinkEntityType, string> = {
  campaign: "Campagna",
  session: "Sessione",
  npc: "NPC",
  location: "Luogo",
  quest: "Quest",
  faction: "Fazione",
  item: "Oggetto",
  lore: "Lore",
  wiki_page: "Wiki",
  task: "Task",
  monster: "Mostro",
  mission: "Missione",
};

export type CommandCenterCampaignOption = {
  id: string;
  name: string;
};

export type CommandCenterSessionOption = {
  id: string;
  title: string | null;
  scheduled_at: string;
};

export type CommandCenterWikiOption = {
  id: string;
  name: string;
  type: string;
};
