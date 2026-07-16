import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "OCAQ Portal", template: "%s | OCAQ" },
  description: "OCAQ filial və növbə idarəetmə portalı",
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
