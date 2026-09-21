import Link from "next/link";
import Image from "next/image";
import { NavbarNavLinks } from "@/components/navbar-nav-links";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 h-16 w-full border-b border-brass-base/20 bg-guild-void/90 backdrop-blur-md supports-[backdrop-filter]:bg-guild-void/80 sm:h-20">
      <nav className="mx-auto flex h-full max-w-6xl items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 min-w-0 rounded focus:outline-none focus:ring-2 focus:ring-brass-base/50 focus:ring-offset-2 focus:ring-offset-guild-void transition-transform hover:scale-105"
        >
          <Image
            src="/logo.png"
            alt="Barber & Dragons"
            width={240}
            height={80}
            className="h-12 w-auto max-w-[170px] object-contain sm:h-16 sm:max-w-[220px] md:max-w-none drop-shadow-[0_0_12px_rgba(217,119,6,0.3)]"
            priority
          />
        </Link>
        <NavbarNavLinks />
      </nav>
    </header>
  );
}
