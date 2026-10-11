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
  const isProjection = pathname?.includes("/proiezione") || pathname?.includes("/fight-projection");
  const isAdmin = pathname?.startsWith("/admin");
  const isOAuthConsent = pathname?.startsWith("/oauth/");

  if (isGmScreen || isProjection || isAdmin || isOAuthConsent) {
    return <>{children}</>;
  }
  return (
    <>
      {navbar}
      {children}
    </>
  );
}
