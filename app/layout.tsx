import type { Metadata } from "next";
import { withBasePath } from "./base-path";
import "./globals.css";

export const dynamic = "force-static";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://lochesystem.github.io/nimvi";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Nimvi",
  description: "Uma criatura pixel art única nasceu na sua aba.",
  manifest: withBasePath("/manifest.webmanifest"),
  themeColor: "#17142b",
  icons: {
    icon: withBasePath("/icon-192.png"),
    apple: withBasePath("/icon-192.png"),
  },
  openGraph: {
    title: "Nimvi",
    description: "Algo está vivendo nesta aba.",
    images: [{ url: withBasePath("/og.png"), width: 1200, height: 630, alt: "Nimvi, uma criatura pixel art única" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nimvi",
    description: "Algo está vivendo nesta aba.",
    images: [withBasePath("/og.png")],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
