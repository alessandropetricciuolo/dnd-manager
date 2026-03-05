"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
          className="rounded-full border border-barber-gold/40 bg-barber-dark/80 text-barber-gold hover:bg-barber-gold/20 hover:text-barber-gold focus:ring-barber-gold/50"
          aria-label="Menu utente"
        >
          <span className="flex h-9 w-9 items-center justify-center text-sm font-semibold">
            {initials}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="min-w-[180px] border-barber-gold/20 bg-barber-dark/95 text-barber-paper backdrop-blur-xl"
      >
        <DropdownMenuItem asChild className="focus:bg-barber-gold/20 focus:text-barber-gold">
          <Link href="/dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="focus:bg-barber-gold/20 focus:text-barber-gold">
          <Link href="/profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Il mio profilo
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-barber-gold/20" />
        <DropdownMenuItem
          className="focus:bg-barber-red/20 focus:text-barber-paper"
          onSelect={(e) => {
            e.preventDefault();
            handleLogout();
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Esci
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
