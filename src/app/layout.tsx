import type { Metadata, Viewport } from "next";
import { Press_Start_2P } from "next/font/google";
import "./globals.css";

const pixel = Press_Start_2P({
  variable: "--font-pixel",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "monke.bar — THE MONKE BAR",
  description:
    "Pixel Solana Monkey Business bar. Lookup Gen2 / Gen3 / Barrel by #, mint, wallet, or SNS. House monke: SMB Gen3 #12192.",
  metadataBase: new URL("https://monke.bar"),
  openGraph: {
    title: "monke.bar — THE MONKE BAR",
    description:
      "SMB Gen2 · Gen3 · Barrel lookup. House monke SMB Gen3 #12192.",
    url: "https://monke.bar",
    siteName: "monke.bar",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "monke.bar",
    description: "THE MONKE BAR — Solana monke lookup",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0705",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={pixel.variable}>
      <body className={pixel.className}>{children}</body>
    </html>
  );
}
