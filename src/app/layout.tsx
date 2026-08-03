import type { Metadata, Viewport } from "next";
import "./globals.css";

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
    <html lang="az" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
