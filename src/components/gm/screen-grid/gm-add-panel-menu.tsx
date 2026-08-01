"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GM_ADD_MENU_GROUPS, GM_PANEL_REGISTRY } from "./gm-panel-registry";
import type { GmPanelType } from "./types";

type GmAddPanelMenuProps = {
  onAdd: (type: GmPanelType) => void;
  presentTypes?: Set<GmPanelType>;
};

export function GmAddPanelMenu({ onAdd, presentTypes }: GmAddPanelMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-6 border-amber-600/40 px-2 text-[10px] text-amber-100 hover:bg-amber-600/15"
        >
          <Plus className="mr-1 h-3 w-3" />
          Pannello
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-[70vh] w-56 overflow-auto border-amber-600/30 bg-zinc-900 text-zinc-100"
      >
        {GM_ADD_MENU_GROUPS.map((group, groupIdx) => (
          <div key={group.label}>
            {groupIdx > 0 ? <DropdownMenuSeparator className="bg-zinc-800" /> : null}
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-amber-400/80">
              {group.label}
            </DropdownMenuLabel>
            {group.types.map((type) => {
              const def = GM_PANEL_REGISTRY[type];
              const already = presentTypes?.has(type) && !def.allowMultiple;
              return (
                <DropdownMenuItem
                  key={type}
                  disabled={already}
                  className="text-xs focus:bg-amber-600/20 focus:text-zinc-100"
                  onSelect={() => onAdd(type)}
                >
                  {def.label}
                  {already ? <span className="ml-auto text-[10px] text-zinc-500">già aperto</span> : null}
                </DropdownMenuItem>
              );
            })}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
