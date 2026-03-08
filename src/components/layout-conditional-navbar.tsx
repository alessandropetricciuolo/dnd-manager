"use client";

import { usePathname } from "next/navigation";

type Props = {
  navbar: React.ReactNode;
  children: React.ReactNode;
};

/** Nasconde la Navbar sulla route GM Screen (pagina pulita a tutto schermo). */
export function LayoutConditionalNavbar({ navbar, children }: Props) {
  const pathname = usePathname();
  const isGmScreen = pathname?.includes("/gm-screen");

  if (isGmScreen) {
    return <>{children}</>;
  }
  return (
    <>
      {navbar}
      {children}
    </>
  );
}
