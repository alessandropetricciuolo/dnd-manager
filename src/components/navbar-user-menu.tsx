"use client";

import Link from "next/link";
import { useRouter } from "nextjs-toploader/app";
import { LayoutDashboard, User, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { signout } from "@/app/auth/actions";

type UserMenuProps = {
  user: {
    id: string;
    email?: string | null;
    user_metadata?: {
      first_name?: string;
      last_name?: string;
      display_name?: string;
    } | null;
  };
};

function getInitials(user: UserMenuProps["user"]): string {
  const meta = user.user_metadata;
  if (meta?.first_name || meta?.last_name) {
    const first = (meta.first_name ?? "").trim().slice(0, 1);
    const last = (meta.last_name ?? "").trim().slice(0, 1);
    if (first || last) return (first + last).toUpperCase();
  }
  if (meta?.display_name?.trim()) {
    const parts = meta.display_name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return meta.display_name.slice(0, 2).toUpperCase();
  }
  if (user.email) {
    return user.email.slice(0, 2).toUpperCase();
  }
  return "?";
}

export function NavbarUserMenu({ user }: UserMenuProps) {
  const router = useRouter();
  const initials = getInitials(user);

  async function handleLogout() {
    await signout();
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full border-2 border-brass-base/60 bg-guild-oak text-brass-light hover:bg-brass-base/20 hover:text-brass-light focus:ring-brass-base/50 shadow-md"
          aria-label="Menu utente"
        >
          <span className="flex h-9 w-9 items-center justify-center font-serif text-xs font-bold uppercase tracking-wider">
            {initials}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="min-w-[200px] border border-brass-base/30 bg-guild-oak/95 text-parchment-100 backdrop-blur-xl shadow-2xl p-1.5"
      >
        <DropdownMenuItem asChild className="rounded-md font-serif text-xs uppercase tracking-wider text-parchment-200 focus:bg-brass-base/15 focus:text-brass-light cursor-pointer">
          <Link href="/dashboard" className="flex items-center gap-2.5 py-2">
            <LayoutDashboard className="h-4 w-4 text-brass-base" />
            <span>Dashboard</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="rounded-md font-serif text-xs uppercase tracking-wider text-parchment-200 focus:bg-brass-base/15 focus:text-brass-light cursor-pointer">
          <Link href="/profile" className="flex items-center gap-2.5 py-2">
            <User className="h-4 w-4 text-brass-base" />
            <span>Il mio profilo</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-guild-border my-1" />
        <DropdownMenuItem
          className="rounded-md font-serif text-xs uppercase tracking-wider text-crimson-light focus:bg-crimson-base/20 focus:text-crimson-light cursor-pointer py-2"
          onSelect={(e) => {
            e.preventDefault();
            handleLogout();
          }}
        >
          <LogOut className="mr-2.5 h-4 w-4 text-crimson-base" />
          <span>Esci dalla Taverna</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
