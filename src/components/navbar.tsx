import { createSupabaseServerClient } from "@/utils/supabase/server";
import { NavbarNavLinks } from "@/components/navbar-nav-links";
import { NavbarLogo } from "@/components/navbar-logo";

export async function Navbar() {
  let user = null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    user = data?.user ?? null;
  } catch {}

  return (
    <header className="sticky top-0 z-50 h-16 w-full border-b border-brass-base/20 bg-guild-void/90 backdrop-blur-md supports-[backdrop-filter]:bg-guild-void/80 sm:h-20">
      <nav className="mx-auto flex h-full max-w-6xl items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6">
        <NavbarLogo />
        <NavbarNavLinks initialUser={user ?? null} />
      </nav>
    </header>
  );
}
