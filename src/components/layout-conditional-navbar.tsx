"use client";

import { usePathname } from "next/navigation";

type Props = {
  navbar: React.ReactNode;
  children: React.ReactNode;
};

/** Nasconde la Navbar su route a tutto schermo (GM Screen, proiezione vista dall'alto). */
export function LayoutConditionalNavbar({ navbar, children }: Props) {
  const pathname = usePathname();
  const isGmScreen = pathname?.includes("/gm-screen");
  const isVistaProiezione = pathname?.includes("/vista-dall-alto/proiezione");

  if (isGmScreen || isVistaProiezione) {
    return <>{children}</>;
  }
  return (
    <>
      {navbar}
      {children}
    </>
  );
}
