import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const incoming = await headers();
  const host = incoming.get("x-forwarded-host") || incoming.get("host") || "localhost:3000";
  const protocol = incoming.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const base = new URL(`${protocol}://${host}`);

  return {
    metadataBase: base,
    title: "Nimvi",
    description: "Uma criatura pixel art única nasceu na sua aba.",
    manifest: "/manifest.webmanifest",
    themeColor: "#17142b",
    icons: {
      icon: "/icon-192.png",
      apple: "/icon-192.png",
    },
    openGraph: {
      title: "Nimvi",
      description: "Algo está vivendo nesta aba.",
      images: [{ url: new URL("/og.png", base).toString(), width: 1200, height: 630, alt: "Nimvi, uma criatura pixel art única" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Nimvi",
      description: "Algo está vivendo nesta aba.",
      images: [new URL("/og.png", base).toString()],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
