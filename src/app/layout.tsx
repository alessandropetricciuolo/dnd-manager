import type { Metadata } from "next";
import { Inter, Playfair_Display, UnifrakturMaguntia } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Navbar } from "@/components/navbar";
import { LayoutConditionalNavbar } from "@/components/layout-conditional-navbar";
import { AuthHashErrorRedirect } from "@/components/auth/auth-hash-error-redirect";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
});

const unifrakturMissions = UnifrakturMaguntia({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-missions",
});

export const metadata: Metadata = {
  title: "Barber & Dragons - D&D Campaign Manager",
  description: "Wiki-style platform per gestire campagne D&D 5e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className="dark">
      <body
        className={`${inter.variable} ${playfair.variable} ${unifrakturMissions.variable} font-sans antialiased`}
      >
        <Script
          src="https://embeds.iubenda.com/widgets/e7d80735-aa56-4d5b-b82d-fe7ee6ce61d6.js"
          strategy="afterInteractive"
        />
        <Script id="iubenda-floating-preferences-left" strategy="lazyOnload">
          {`(function () {
  function patch() {
    try {
      if (window._iub && window._iub.csSiteConf) {
        window._iub.csSiteConf.floatingPreferencesButtonDisplay = "bottom-left";
      }
    } catch (_) {}
  }
  patch();
  var n = 0;
  var t = setInterval(function () {
    patch();
    if (++n > 60) clearInterval(t);
  }, 200);
})();`}
        </Script>
        <NextTopLoader color="#D4AF37" showSpinner={false} />
        <LayoutConditionalNavbar navbar={<Navbar />}>
          <AuthHashErrorRedirect />
          {children}
        </LayoutConditionalNavbar>
        <Toaster richColors closeButton />
        <Script src="https://cdn.iubenda.com/iubenda.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}
