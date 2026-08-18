import LookupApp from "@/app/components/LookupApp";
import {
  isPathCollection,
  PATH_TO_COLLECTION,
  type PathCollection,
} from "@/lib/deeplink";
import { COLLECTIONS } from "@/lib/collections";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ collection: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { collection, id } = await params;
  if (!isPathCollection(collection) || !/^\d{1,5}$/.test(id)) {
    return { title: "monke.bar" };
  }
  const col = PATH_TO_COLLECTION[collection];
  const name = `${COLLECTIONS[col].numberPrefix} #${id}`;
  return {
    title: `${name} · monke.bar`,
    description: `Lookup ${name} on Solana Monkey Business`,
    openGraph: {
      title: `${name} · monke.bar`,
      url: `https://monke.bar/${collection}/${id}`,
    },
    alternates: { canonical: `https://monke.bar/${collection}/${id}` },
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
