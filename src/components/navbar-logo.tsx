"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavbarLogo() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolledPastHero, setScrolledPastHero] = useState(false);

  useEffect(() => {
    if (!isHome) {
      setScrolledPastHero(true);
      return;
    }

    const handleScroll = () => {
      // Nella homepage, il logo appare nella navbar solo dopo aver superato la Hero (~380px)
      setScrolledPastHero(window.scrollY > 380);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHome]);

  // Se siamo nella homepage e non abbiamo ancora superato la hero, nascondi il logo nella navbar
  const isHiddenInHero = isHome && !scrolledPastHero;

  return (
    <Link
      href="/"
      className={cn(
        "flex shrink-0 min-w-0 rounded focus:outline-none focus:ring-2 focus:ring-brass-base/50 focus:ring-offset-2 focus:ring-offset-guild-void transition-all duration-300",
        isHiddenInHero
          ? "opacity-0 pointer-events-none -translate-x-3 scale-95"
          : "opacity-100 translate-x-0 scale-100 hover:scale-105"
      )}
      aria-hidden={isHiddenInHero}
      tabIndex={isHiddenInHero ? -1 : 0}
    >
      <Image
        src="/logo.png"
        alt="Barber & Dragons"
        width={200}
        height={65}
        className="h-10 w-auto max-w-[150px] object-contain sm:h-12 md:max-w-none drop-shadow-[0_0_12px_rgba(217,119,6,0.3)]"
        priority
      />
    </Link>
  );
}
