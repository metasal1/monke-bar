import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Press_Start_2P } from "next/font/google";
import { GA_ID } from "@/lib/analytics";
import { HOUSE_MONKE } from "@/lib/house-monke";
import "./globals.css";

const pixel = Press_Start_2P({
  variable: "--font-pixel",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const SITE = "https://monke.bar";

export const metadata: Metadata = {
  title: {
    default: "monke.bar — THE MONKE BAR | SMB Gen2 Gen3 Barrel Lookup",
    template: "%s · monke.bar",
  },
  description:
    "Pixel Solana Monkey Business bar. Lookup SMB Gen2, Gen3, and Barrel by monke #, mint, wallet, or SNS (.sol). Floor, rarity, owner. Trade on Tensor + Magic Eden.",
  metadataBase: new URL(SITE),
  applicationName: "monke.bar",
  keywords: [
    "Solana Monkey Business",
    "SMB Gen2",
    "SMB Gen3",
    "SMB Barrel",
    "Solana NFT",
    "monke.bar",
    "HowRare",
    "Magic Eden",
    "Tensor",
    "NFT lookup",
  ],
  authors: [{ name: "Metasal", url: "https://metasal.xyz" }],
  creator: "Metasal",
  publisher: "Metasal",
  alternates: {
    types: {
      "text/plain": [{ url: "/llms.txt", title: "llms.txt" }],
    },
  },
  openGraph: {
    title: "monke.bar — THE MONKE BAR",
    description:
      "SMB Gen2 · Gen3 · Barrel lookup. House monke SMB Gen3 #12192. Tensor + Magic Eden.",
    url: SITE,
    siteName: "monke.bar",
    type: "website",
    locale: "en_AU",
  },
  twitter: {
    card: "summary",
    title: "monke.bar — THE MONKE BAR",
    description: "Solana monke NFT lookup · Gen2 Gen3 Barrel",
    creator: "@metasal",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  category: "cryptocurrency",
};

export const viewport: Viewport = {
  themeColor: "#0a0705",
  colorScheme: "dark",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE}/#website`,
      url: SITE,
      name: "monke.bar",
      description:
        "Solana Monkey Business NFT lookup — Gen2, Gen3, Barrel",
      publisher: { "@id": `${SITE}/#org` },
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE}/?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Organization",
      "@id": `${SITE}/#org`,
      name: "monke.bar",
      url: SITE,
      founder: { "@type": "Person", name: "Metasal", url: "https://metasal.xyz" },
      sameAs: ["https://metasal.xyz", "https://solanamonkey.business/"],
    },
    {
      "@type": "WebApplication",
      name: "THE MONKE BAR",
      url: SITE,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      featureList: [
        "SMB Gen2 lookup",
        "SMB Gen3 lookup",
        "SMB Barrel lookup",
        "SNS .sol resolve",
        "Magic Eden + Tensor trade links",
      ],
    },
    {
      "@type": "CreativeWork",
      name: HOUSE_MONKE.name,
      url: `${SITE}${HOUSE_MONKE.href}`,
      identifier: HOUSE_MONKE.mint,
      creator: { "@type": "Person", name: "Metasal", url: "https://metasal.xyz" },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={pixel.variable}>
      <body className={pixel.className}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga4" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}
        </Script>
      </body>
    </html>
  );
}
