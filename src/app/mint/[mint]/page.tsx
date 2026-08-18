import LookupApp from "@/app/components/LookupApp";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

const MINT_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

type Props = { params: Promise<{ mint: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { mint } = await params;
  return {
    title: `Mint ${mint.slice(0, 8)}… · monke.bar`,
    alternates: { canonical: `https://monke.bar/mint/${mint}` },
  };
}

export default async function MintDeeplinkPage({ params }: Props) {
  const { mint } = await params;
  if (!MINT_RE.test(mint)) notFound();
  return (
    <LookupApp
      initialCollection="all"
      initialQuery={mint}
      deeplinkPath={`/mint/${mint}`}
    />
  );
}
