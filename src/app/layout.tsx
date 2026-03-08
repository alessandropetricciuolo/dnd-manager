import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Navbar } from "@/components/navbar";
import { CookieBanner } from "@/components/ui/cookie-banner";
import { LayoutConditionalNavbar } from "@/components/layout-conditional-navbar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
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
      <body className={`${inter.variable} ${playfair.variable} font-sans antialiased`}>
        <NextTopLoader color="#D4AF37" showSpinner={false} />
        <LayoutConditionalNavbar navbar={<Navbar />}>
          {children}
        </LayoutConditionalNavbar>
        <Toaster richColors closeButton />
        <CookieBanner />
      </body>
    </html>
  );
}
