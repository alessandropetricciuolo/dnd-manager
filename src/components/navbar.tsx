import Link from "next/link";
import Image from "next/image";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-barber-gold/20 bg-barber-dark/95 backdrop-blur supports-[backdrop-filter]:bg-barber-dark/80">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="shrink-0 focus:outline-none focus:ring-2 focus:ring-barber-gold/50 focus:ring-offset-2 focus:ring-offset-barber-dark rounded">
          <Image
            src="/logo.png"
            alt="Barber & Dragons"
            width={180}
            height={60}
            className="h-12 w-auto object-contain sm:h-14"
            priority
          />
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-sm font-medium text-barber-paper/90 transition-colors hover:text-barber-gold"
          >
            Home
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-barber-paper/90 transition-colors hover:text-barber-gold"
          >
            Accedi
          </Link>
          <Link
            href="/login"
            className="rounded-md bg-barber-red px-4 py-2 text-sm font-medium text-barber-paper transition-colors hover:bg-barber-red/90"
          >
            Registrati
          </Link>
        </div>
      </nav>
    </header>
  );
}
