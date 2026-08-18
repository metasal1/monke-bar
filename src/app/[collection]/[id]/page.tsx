import type { Metadata } from "next";
import { howrareByNumber } from "@/lib/howrare";
import {
  isPathCollection,
  PATH_TO_COLLECTION,
  type PathCollection,
} from "@/lib/deeplink";
import { COLLECTIONS } from "@/lib/collections";
import LookupApp from "@/app/components/LookupApp";
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
  const desc = `${name} on Solana Monkey Business · monke.bar`;

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
