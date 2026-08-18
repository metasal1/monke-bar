import type { MonkeCollectionId } from "./collections";
import { COLLECTIONS } from "./collections";
import smbGen2Index from "@/data/smb-gen2-index.json";

export interface HowrareItem {
  id: number;
  mint: string;
  name: string;
  image: string;
  rank: number | null;
  link: string;
  attributes: { name: string; value: string; rarity?: string }[];
}

interface CompactEntry {
  m: string;
  r?: number | null;
  img?: string;
}

interface StaticIndex {
  collection: string;
  slug: string;
  count: number;
  byId: Record<string, CompactEntry>;
}

const STATIC: Partial<Record<MonkeCollectionId, StaticIndex>> = {
  smb_gen2: smbGen2Index as StaticIndex,
};

// reverse mint → id for gen2
const GEN2_MINT_TO_ID = new Map<string, number>();
for (const [id, e] of Object.entries(STATIC.smb_gen2!.byId)) {
  if (e?.m) GEN2_MINT_TO_ID.set(e.m, Number(id));
}

function fromStatic(
  collectionId: MonkeCollectionId,
  num: number
): HowrareItem | null {
  const idx = STATIC[collectionId];
  if (!idx) return null;
  const e = idx.byId[String(num)];
  if (!e?.m) return null;
  const slug = idx.slug || COLLECTIONS[collectionId].howrareSlug || "smb";
  return {
    id: num,
    mint: e.m,
    name: `SMB #${num}`,
    image: e.img || "",
    rank: e.r != null ? Number(e.r) : null,
    link: `https://howrare.is/${slug}/${num}`,
    attributes: [],
  };
}

function fromStaticMint(
  collectionId: MonkeCollectionId,
  mint: string
): HowrareItem | null {
  if (collectionId === "smb_gen2") {
    const id = GEN2_MINT_TO_ID.get(mint);
    if (id != null) return fromStatic("smb_gen2", id);
  }
  return null;
}

/** Optional live HowRare hydrate for traits (slow; only when needed). */
export async function hydrateHowrareTraits(
  collectionId: MonkeCollectionId,
  num: number
): Promise<HowrareItem | null> {
  const slug = COLLECTIONS[collectionId].howrareSlug;
  if (!slug) return null;
  try {
    // collection dump is huge — use static + on-chain attrs instead
    return fromStatic(collectionId, num);
  } catch {
    return null;
  }
}

export async function howrareByNumber(
  collectionId: MonkeCollectionId,
  num: number
): Promise<HowrareItem | null> {
  const local = fromStatic(collectionId, num);
  if (local) return local;

  // fallback live (Gen3 etc.)
  const slug = COLLECTIONS[collectionId].howrareSlug;
  if (!slug) return null;
  try {
    const res = await fetch(
      `https://api.howrare.is/v0.1/collections/${slug}`,
      { next: { revalidate: 86400 }, headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const items = json?.result?.data?.items;
    if (!Array.isArray(items)) return null;
    const raw = items.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (i: any) => Number(i.id) === num
    );
    if (!raw) return null;
    return {
      id: num,
      mint: String(raw.mint || ""),
      name: String(raw.name || `SMB #${num}`),
      image: String(raw.image || ""),
      rank: raw.rank != null ? Number(raw.rank) : null,
      link: String(raw.link || `https://howrare.is/${slug}/${num}`),
      attributes: Array.isArray(raw.attributes)
        ? raw.attributes.map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (a: any) => ({
              name: String(a.name || ""),
              value: String(a.value ?? ""),
              rarity: a.rarity != null ? String(a.rarity) : undefined,
            })
          )
        : [],
    };
  } catch {
    return null;
  }
}

export async function howrareByMint(
  collectionId: MonkeCollectionId,
  mint: string
): Promise<HowrareItem | null> {
  const local = fromStaticMint(collectionId, mint);
  if (local) return local;
  return null;
}
