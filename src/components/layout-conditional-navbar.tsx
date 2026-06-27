"use client";

import { usePathname } from "next/navigation";

type Props = {
  navbar: React.ReactNode;
  children: React.ReactNode;
};

/** Nasconde la Navbar su route a tutto schermo o area admin (nav dedicata). */
export function LayoutConditionalNavbar({ navbar, children }: Props) {
  const pathname = usePathname();
  const isGmScreen = pathname?.includes("/gm-screen");
  const isVistaProiezione = pathname?.includes("/vista-dall-alto/proiezione");
  const isAdmin = pathname?.startsWith("/admin");

  if (isGmScreen || isVistaProiezione || isAdmin) {
    return <>{children}</>;
  }
  return (
    <>
      {navbar}
      {children}
    </>
  );
}
