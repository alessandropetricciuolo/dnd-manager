"use client";

import { WikiEntityDialog, type WikiEntityDialogProps } from "./wiki-entity-dialog";

type EditEntityDialogProps = WikiEntityDialogProps & {
  entity: NonNullable<WikiEntityDialogProps["entity"]>;
  contentBody: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EditEntityDialog(props: EditEntityDialogProps) {
  // Both entry points use the same fields, layout and generation tools.
  // Unmount on close so pending uploads and AI drafts cannot leak into the next edit.
  return props.open ? <WikiEntityDialog key={props.entity.id} {...props} /> : null;
}
