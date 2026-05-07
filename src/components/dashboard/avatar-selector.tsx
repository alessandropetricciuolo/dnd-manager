"use client";

import Image from "next/image";
import { Check, Lock, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import type { AvatarWithAchievement } from "@/lib/avatar-gallery";

type AvatarSelectorProps = {
  avatars: AvatarWithAchievement[];
  unlockedAchievementIds: string[];
  value: string | null;
  onChange: (imageUrl: string | null) => void;
  disabled?: boolean;
};

function isUnlocked(
  avatar: AvatarWithAchievement,
  unlockedAchievementIds: string[]
): boolean {
  if (avatar.is_default) return true;
  if (!avatar.required_achievement_id) return true;
  return unlockedAchievementIds.includes(avatar.required_achievement_id);
}

export function AvatarSelector({
  avatars,
  unlockedAchievementIds,
  value,
  onChange,
  disabled = false,
}: AvatarSelectorProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
        {/* Tile "Nessun avatar" per deselezionare */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(null)}
          className={cn(
            "relative flex aspect-square w-full overflow-hidden rounded-xl border-2 border-dashed transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-barber-gold focus-visible:ring-offset-2 focus-visible:ring-offset-barber-dark",
            value === null
              ? "ring-4 ring-yellow-500 border-yellow-500 bg-barber-gold/10"
              : "cursor-pointer border-barber-gold/20 bg-barber-dark/60 hover:scale-105 hover:border-barber-gold/40"
          )}
          aria-pressed={value === null}
          aria-label="Nessun avatar"
        >
          <span className="absolute inset-0 flex items-center justify-center text-barber-paper/50">
            <UserCircle className="h-8 w-8 sm:h-10 sm:w-10" />
          </span>
        </button>
        {avatars.map((avatar) => {
          const unlocked = isUnlocked(avatar, unlockedAchievementIds);
          const selected = value === avatar.image_url;

          const content = (
            <button
              type="button"
              disabled={disabled || !unlocked}
              onClick={() => unlocked && onChange(avatar.image_url)}
              className={cn(
                "relative flex aspect-square w-full overflow-hidden rounded-xl border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-barber-gold focus-visible:ring-offset-2 focus-visible:ring-offset-barber-dark",
                selected &&
                  "ring-4 ring-yellow-500 border-yellow-500 shadow-lg shadow-yellow-500/20",
                unlocked && !selected && "cursor-pointer border-barber-gold/30 hover:scale-105 hover:border-barber-gold/60",
                !unlocked && "cursor-not-allowed grayscale opacity-60 border-barber-paper/20"
              )}
              aria-pressed={selected}
              aria-label={unlocked ? `Seleziona ${avatar.name}` : `Bloccato: ${avatar.name}`}
            >
              <Image
                src={avatar.image_url}
                alt={avatar.name}
                fill
                sizes="(max-width: 640px) 20vw, 96px"
                className="object-cover"
              />
              {selected && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Check className="h-8 w-8 text-yellow-400 drop-shadow-md sm:h-10 sm:w-10" />
                </span>
              )}
              {!unlocked && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Lock className="h-6 w-6 text-barber-paper/80 sm:h-8 sm:w-8" />
                </span>
              )}
            </button>
          );

          if (!unlocked && avatar.required_achievement_title) {
            return (
              <Tooltip key={avatar.id}>
                <TooltipTrigger asChild>
                  <div className="min-w-0">{content}</div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px] text-center">
                  Sblocca con l&apos;achievement: {avatar.required_achievement_title}
                </TooltipContent>
              </Tooltip>
            );
          }

          return <div key={avatar.id} className="min-w-0">{content}</div>;
        })}
      </div>
    </TooltipProvider>
  );
}
