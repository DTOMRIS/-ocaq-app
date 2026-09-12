import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

/**
 * TİPOQRAFİYA.
 *
 * Sistem bu vaxta qədər Arial-la işləyirdi — yəni şrift heç vaxt SEÇİLMƏMİŞDİ.
 * «Sadə görünür» şikayətinin birinci səbəbi budur.
 *
 * Plus Jakarta Sans: humanist-geometrik, isti, Azərbaycan diakritikləri
 * (ə ğ ş ı ü ö ç) tam dəstəklənir və cədvəl rəqəmləri üçün `tabular-nums`
 * variantı var — maliyyə ekranında sütunlar sürüşmür.
 * JetBrains Mono: kod, fayl yolu, tarix və sənəd nömrələri üçün.
 *
 * `next/font` şrifti ÖZ SERVERİMİZDƏN verir: xarici sorğu yoxdur, yüklənəndə
 * mətn sıçramır (`display: swap` + ölçü uyğunlaşdırması avtomatik).
 */
const sans = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans-ocaq",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--font-mono-ocaq",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "OCAQ Portal", template: "%s | OCAQ" },
  description: "OCAQ filial və növbə idarəetmə portalı",
};

// `viewportFit: 'cover'` olmadan `env(safe-area-inset-*)` 0px-ə həll olunur.
// Kodda o dəyər ARTIQ yazılıb (vardiya-checklist sticky footer, haccp footer) —
// yəni çentikli iPhone-da "Checklistı Göndər" home indicator zonasına düşürdü.
// Bu export mövcud kodu işlək edir. `user-scalable`/`maximum-scale` QOYULMUR
// (yaxınlaşdırmanı bloklamaq WCAG 2.1 pozuntusudur).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1A1614",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="az" className={`h-full antialiased ${sans.variable} ${mono.variable}`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
