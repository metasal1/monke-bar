import type { MonkeCollectionId } from "./collections";
import { COLLECTIONS } from "./collections";
import smbGen2Index from "@/data/smb-gen2-index.json";
import smbGen3Index from "@/data/smb-gen3-index.json";
import smbBarrelIndex from "@/data/smb-barrel-index.json";

export interface HowrareItem {
  id: number;
  mint: string;
  name: string;
  image: string;
  rank: number | null;
  link: string | null;
  attributes: { name: string; value: string; rarity?: string }[];
}

interface CompactEntry {
  m: string;
  r?: number | null;
  img?: string;
}

interface StaticIndex {
  collection: string;
  slug?: string | null;
  count: number;
  byId: Record<string, CompactEntry>;
  partial?: boolean;
}

const STATIC: Record<MonkeCollectionId, StaticIndex> = {
  smb_gen2: smbGen2Index as StaticIndex,
  smb_gen3: smbGen3Index as StaticIndex,
  smb_barrel: smbBarrelIndex as StaticIndex,
};

const MINT_TO_ID: Record<MonkeCollectionId, Map<string, number>> = {
  smb_gen2: new Map(),
  smb_gen3: new Map(),
  smb_barrel: new Map(),
};

for (const id of Object.keys(STATIC) as MonkeCollectionId[]) {
  for (const [num, e] of Object.entries(STATIC[id].byId)) {
    if (e?.m) MINT_TO_ID[id].set(e.m, Number(num));
  }
}

function displayName(collectionId: MonkeCollectionId, num: number): string {
  return `${COLLECTIONS[collectionId].numberPrefix} #${num}`;
}

function fromStatic(
  collectionId: MonkeCollectionId,
  num: number
): HowrareItem | null {
  const idx = STATIC[collectionId];
  if (!idx) return null;
  const e = idx.byId[String(num)];
  if (!e?.m) return null;
  const slug = idx.slug || COLLECTIONS[collectionId].howrareSlug;
  return {
    id: num,
    mint: e.m,
    name: displayName(collectionId, num),
    image: e.img || "",
    rank: e.r != null ? Number(e.r) : null,
    link: slug ? `https://howrare.is/${slug}/${num}` : null,
    attributes: [],
  };
}

export function indexStats(collectionId: MonkeCollectionId): {
  count: number;
  partial: boolean;
} {
  const idx = STATIC[collectionId];
  return {
    count: idx?.count ?? 0,
    partial: Boolean(idx?.partial || COLLECTIONS[collectionId].partialIndex),
  };
}

export async function howrareByNumber(
  collectionId: MonkeCollectionId,
  num: number
): Promise<HowrareItem | null> {
  return fromStatic(collectionId, num);
}

export async function howrareByMint(
  collectionId: MonkeCollectionId,
  mint: string
): Promise<HowrareItem | null> {
  const id = MINT_TO_ID[collectionId].get(mint);
  if (id == null) return null;
  return fromStatic(collectionId, id);
}

/** Detect which collection a mint belongs to via static indexes */
export function collectionIdForMint(mint: string): MonkeCollectionId | null {
  for (const id of Object.keys(MINT_TO_ID) as MonkeCollectionId[]) {
    if (MINT_TO_ID[id].has(mint)) return id;
  }
  return null;
}
