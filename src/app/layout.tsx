import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Press_Start_2P } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const pixel = Press_Start_2P({
  variable: "--font-pixel",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "monke.bar — Solana Monke Lookup",
  description:
    "Lookup Solana Monkey Business (SMB Gen2) by monke #, mint, or wallet. Floor, rarity, owner.",
  metadataBase: new URL("https://monke.bar"),
  openGraph: {
    title: "monke.bar — Solana Monke Lookup",
    description:
      "SMB Gen2 lookup: monke #, mint, wallet. Floor + HowRare + owner.",
    url: "https://monke.bar",
    siteName: "monke.bar",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "monke.bar",
    description: "Solana Monke NFT collection lookup",
  },
};

export const viewport: Viewport = {
  themeColor: "#0c0a08",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${pixel.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
