import type { Metadata } from "next";
import { JetBrains_Mono, Schibsted_Grotesk } from "next/font/google";
import "./globals.css";

/*
  İki yazı karakteri, iki net görev:
  - Schibsted Grotesk: başlıklar ve arayüz metni. Sıkı apertürleri ve
    biraz sivri karakteriyle Inter/Geist'in nötrlüğünden ayrılıyor.
  - JetBrains Mono: SAATLER. Cetvel rakamları, süreler, "şimdi" göstergesi.
    Ölçüm aleti hissini taşıyan asıl karakter bu.
*/
const sans = Schibsted_Grotesk({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ChronoFlow — Günlük Zaman Bloklama",
  description:
    "Sürükle-bırak destekli, akıllı tampon süreli günlük zaman planlama uygulaması.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="tr"
      className={`${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
