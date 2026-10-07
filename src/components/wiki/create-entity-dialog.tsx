"use client";

import { WikiEntityDialog, type WikiEntityDialogProps } from "./wiki-entity-dialog";

export function CreateEntityDialog(props: Omit<WikiEntityDialogProps, "entity" | "contentBody" | "open" | "onOpenChange">) {
  return <WikiEntityDialog {...props} />;
}
