import type { Metadata, Viewport } from "next";
import { Archivo, IBM_Plex_Mono, Tiro_Devanagari_Hindi } from "next/font/google";
import { Footer } from "@/components/Footer";
import { TabNav } from "@/components/TabNav";
import { Ticker } from "@/components/Ticker";
import { LangProvider } from "@/lib/i18n";
import "./globals.css";

const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo", display: "swap" });
const tiro = Tiro_Devanagari_Hindi({ subsets: ["latin", "devanagari"], weight: "400", style: ["normal", "italic"], variable: "--font-tiro", display: "swap" });
const plex = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://halftime.prashantthakur.dev"),
  title: { default: "HalfTime: who has already served half", template: "%s · HalfTime" },
  description:
    "HalfTime reads a jail's court papers in Hindi or English, finds every undertrial who has crossed the Section 479 BNSS line, shows its working, and drafts the application a lawyer signs.",
  openGraph: {
    title: "HalfTime",
    description: "Reads the court papers. Code applies Section 479. A lawyer signs.",
    url: "https://halftime.prashantthakur.dev",
    siteName: "HalfTime",
    type: "website"
  },
  robots: { index: true, follow: true }
};

export const viewport: Viewport = { themeColor: "#f1ece0", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${tiro.variable} ${plex.variable}`}>
      <body className="grain">
        <a href="#main" className="skip-link">Skip to content</a>
        <LangProvider>
          <Ticker />
          <TabNav />
          <main id="main">{children}</main>
          <Footer />
        </LangProvider>
      </body>
    </html>
  );
}
