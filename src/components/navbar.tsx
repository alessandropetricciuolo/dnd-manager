import Link from "next/link";
import Image from "next/image";
import { NavbarAuthSlot } from "@/components/navbar-auth-slot";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 h-16 w-full border-b border-barber-gold/20 bg-barber-dark/95 backdrop-blur supports-[backdrop-filter]:bg-barber-dark/80">
      <nav className="mx-auto flex h-full max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 min-w-0 rounded focus:outline-none focus:ring-2 focus:ring-barber-gold/50 focus:ring-offset-2 focus:ring-offset-barber-dark"
        >
          <Image
            src="/logo.png"
            alt="Barber & Dragons"
            width={180}
            height={60}
            className="h-10 w-auto max-w-[140px] object-contain sm:h-12 md:max-w-none md:h-14"
            priority
          />
        </Link>
        <div className="flex min-w-0 shrink items-center gap-2 sm:gap-4 md:gap-6">
          <Link
            href="/"
            className="text-sm font-medium text-barber-paper/90 transition-colors hover:text-barber-gold"
          >
            Home
          </Link>
          <Link
            href="/masters"
            className="text-sm font-medium text-barber-paper/90 transition-colors hover:text-barber-gold"
          >
            Albo Master
          </Link>
          <Link
            href="/hall-of-fame"
            className="text-sm font-medium text-barber-paper/90 transition-colors hover:text-barber-gold"
          >
            Classifica Eroi
          </Link>
          <Link
            href="/contatti"
            className="text-sm font-medium text-barber-paper/90 transition-colors hover:text-barber-gold"
          >
            Contatti
          </Link>
          <NavbarAuthSlot />
        </div>
      </nav>
    </header>
  );
}
