import LookupApp from "@/app/components/LookupApp";
import {
  isPathCollection,
  PATH_TO_COLLECTION,
  type PathCollection,
} from "@/lib/deeplink";
import { COLLECTIONS } from "@/lib/collections";
import { howrareByNumber } from "@/lib/howrare";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ collection: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { collection, id } = await params;
  if (!isPathCollection(collection) || !/^\d{1,5}$/.test(id)) {
    return { title: "monke.bar" };
  }
  const col = PATH_TO_COLLECTION[collection];
  const rarity = await howrareByNumber(col, Number(id));
  const name =
    rarity?.name || `${COLLECTIONS[col].numberPrefix} #${id}`;
  const path = `/${collection}/${id}`;
  const url = `https://monke.bar${path}`;
  const desc = rarity?.rank
    ? `${name} · HowRare #${rarity.rank} · open on monke.bar`
    : `${name} on Solana Monkey Business · open on monke.bar`;

  return {
    title: name,
    description: desc,
    alternates: { canonical: url },
    openGraph: {
      title: `${name} · monke.bar`,
      description: desc,
      url,
      siteName: "monke.bar",
      type: "website",
      // Dynamic opengraph-image.tsx on this segment; keep explicit deeplink url
    },
    twitter: {
      card: "summary_large_image",
      title: `${name} · monke.bar`,
      description: desc,
    },
  };
}

export default async function MonkeDeeplinkPage({ params }: Props) {
  const { collection, id } = await params;
  if (!isPathCollection(collection)) notFound();
  if (!/^\d{1,5}$/.test(id)) notFound();

  const col = PATH_TO_COLLECTION[collection as PathCollection];
  return (
    <LookupApp
      initialCollection={col}
      initialQuery={id}
      deeplinkPath={`/${collection}/${id}`}
    />
  );
}
