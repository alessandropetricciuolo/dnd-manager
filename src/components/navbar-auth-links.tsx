import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavbarUserMenu } from "@/components/navbar-user-menu";
import { useSupabaseUser } from "@/hooks/use-supabase-user";
import type { User } from "@supabase/supabase-js";

export function NavbarAuthLinks({ initialUser }: { initialUser?: User | null }) {
  const { user, ready } = useSupabaseUser(initialUser);
  const currentUser = user ?? initialUser;

  if (currentUser) {
    return (
      <div className="flex items-center gap-2 sm:gap-3">
        <Button
          asChild
          size="sm"
          variant="wax"
          className="h-8 sm:h-9 px-2.5 sm:px-3.5 text-xs font-serif uppercase tracking-wider font-bold shadow-md"
        >
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 sm:gap-2">
            <LayoutDashboard className="h-3.5 w-3.5 text-amber-200" />
            <span>Dashboard</span>
          </Link>
        </Button>
        <NavbarUserMenu user={currentUser} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 sm:gap-3.5">
      <Link
        href="/login"
        className="hidden text-xs font-serif uppercase tracking-wider text-parchment-200 transition-colors hover:text-brass-light sm:inline"
      >
        Entra
      </Link>
      <Link
        href="/login"
        className="btn-wax-seal inline-flex items-center justify-center rounded-lg px-3.5 py-1.5 text-xs font-serif uppercase tracking-widest font-bold text-parchment-100 shadow-md sm:px-4 sm:py-1.5"
      >
        Unisciti
      </Link>
    </div>
  );
}
