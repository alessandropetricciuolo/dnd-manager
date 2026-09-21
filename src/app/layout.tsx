import type { Metadata } from "next";
import { Cinzel, JetBrains_Mono, Plus_Jakarta_Sans, UnifrakturMaguntia } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Navbar } from "@/components/navbar";
import { LayoutConditionalNavbar } from "@/components/layout-conditional-navbar";
import { AuthHashErrorRedirect } from "@/components/auth/auth-hash-error-redirect";
import { CampaignNavigationProvider } from "@/components/campaigns/campaign-navigation-context";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const unifrakturMissions = UnifrakturMaguntia({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-missions",
});

export const metadata: Metadata = {
  title: "Barber & Dragons - D&D Campaign Manager",
  description: "La migliore community di D&D della provincia di Napoli.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className="dark">
      <body
        className={`${plusJakarta.variable} ${cinzel.variable} ${jetbrainsMono.variable} ${unifrakturMissions.variable} font-sans antialiased selection:bg-brass-base/30 selection:text-parchment-100`}
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
        <NextTopLoader color="#c89d49" showSpinner={false} />
        <CampaignNavigationProvider>
          <LayoutConditionalNavbar navbar={<Navbar />}>
            <AuthHashErrorRedirect />
            {children}
          </LayoutConditionalNavbar>
        </CampaignNavigationProvider>
        <Toaster richColors closeButton />
        <Script src="https://cdn.iubenda.com/iubenda.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}
