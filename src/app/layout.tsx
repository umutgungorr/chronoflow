import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Schibsted_Grotesk } from "next/font/google";
import "./globals.css";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

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
  // iOS manifest'teki `display` alanını okumaz; tam ekran açılması için
  // bu meta etiketleri gerekiyor.
  appleWebApp: {
    capable: true,
    title: "ChronoFlow",
    statusBarStyle: "black-translucent",
  },
  other: {
    // Next yalnızca standart adı (`mobile-web-app-capable`) yazıyor.
    // iOS 16.4 öncesi sürümler hâlâ bu eski adı arıyor; olmadan ana
    // ekrandan açılınca tam ekran değil, tarayıcı içinde açılır.
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  // Telefonun durum çubuğu uygulamanın zeminiyle aynı renge boyanır.
  // Manifest tek renk kabul ediyor ama burada temaya göre ayırabiliyoruz.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef0f4" },
    { media: "(prefers-color-scheme: dark)", color: "#080a0e" },
  ],
  // Izgara zaten dokunmatikte sürükleniyor; çift dokunuşla yakınlaşma
  // kazayla tetikleniyor ve blok taşımayı bozuyor.
  maximumScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="tr"
      className={`${sans.variable} ${mono.variable} h-full antialiased`}
      // Tema betiği <html> sınıfını sunucudan farklı hale getirebilir.
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        {/* React yüklenmeden çalışır: açık temanın bir kare görünüp
            karanlığa atlamasını (flash) engeller. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {children}
      </body>
    </html>
  );
}
