export const COMMAND_LINK_ENTITY_TYPES = [
  "campaign",
  "session",
  "npc",
  "location",
  "quest",
  "faction",
  "item",
  "lore",
  "wiki_page",
  "task",
  "monster",
  "mission",
] as const;

export type CommandLinkEntityType = (typeof COMMAND_LINK_ENTITY_TYPES)[number];

export const COMMAND_NOTE_STATUSES = [
  "inbox",
  "reviewed",
  "linked",
  "converted",
  "archived",
] as const;

export type CommandNoteStatus = (typeof COMMAND_NOTE_STATUSES)[number];

export const COMMAND_INPUT_SOURCES = [
  "text",
  "voice",
  "manual",
  "import",
  "image",
  "file",
] as const;

export type CommandInputSource = (typeof COMMAND_INPUT_SOURCES)[number];

export const WORKSPACE_TASK_STATUSES = ["todo", "doing", "done", "archived"] as const;
export type WorkspaceTaskStatus = (typeof WORKSPACE_TASK_STATUSES)[number];

export const WORKSPACE_TASK_PRIORITIES = ["low", "medium", "high"] as const;
export type WorkspaceTaskPriority = (typeof WORKSPACE_TASK_PRIORITIES)[number];

export const WORKSPACE_PAGE_TYPES = [
  "note",
  "doc",
  "task_board",
  "wiki_draft",
  "planning",
  "recap",
  "idea",
] as const;

export type WorkspacePageType = (typeof WORKSPACE_PAGE_TYPES)[number];

export type CommandNoteRow = {
  id: string;
  workspace_id: string | null;
  campaign_id: string | null;
  title: string;
  content: string;
  status: CommandNoteStatus;
  source_input_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type WorkspaceTaskRow = {
  id: string;
  workspace_id: string | null;
  campaign_id: string | null;
  session_id: string | null;
  title: string;
  description: string;
  status: WorkspaceTaskStatus;
  priority: WorkspaceTaskPriority;
  due_date: string | null;
  assigned_to: string | null;
  source_note_id: string | null;
  source_action_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type WorkspacePageRow = {
  id: string;
  workspace_id: string | null;
  campaign_id: string | null;
  parent_page_id: string | null;
  title: string;
  icon: string | null;
  page_type: WorkspacePageType;
  content_markdown: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type CommandLinkRow = {
  id: string;
  workspace_id: string | null;
  note_id: string | null;
  input_id: string | null;
  entity_type: string;
  entity_id: string;
  confidence: number | null;
  created_at: string;
};
