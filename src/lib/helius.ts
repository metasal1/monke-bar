import {
  ALL_COLLECTION_MINTS,
  COLLECTIONS,
  type MonkeCollectionId,
} from "./collections";

const DEFAULT_RPC =
  process.env.HELIUS_RPC_URL ||
  "https://viviyan-bkj12u-fast-mainnet.helius-rpc.com";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DasAsset = any;

async function heliusRpc<T>(
  method: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any
): Promise<T> {
  const res = await fetch(DEFAULT_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: "monke", method, params }),
    next: { revalidate: 30 },
  });
  if (!res.ok) {
    throw new Error(`Helius HTTP ${res.status}`);
  }
  const json = await res.json();
  if (json.error) {
    throw new Error(json.error.message || "Helius RPC error");
  }
  return json.result as T;
}

export interface NormalizedMonke {
  mint: string;
  name: string;
  number: number | null;
  image: string;
  owner: string | null;
  collectionMint: string | null;
  attributes: { trait_type: string; value: string | number }[];
  frozen: boolean;
  compressed: boolean;
  source: "helius";
}

function extractNumber(name: string): number | null {
  const m = name.match(/#\s*(\d+)/);
  return m ? Number(m[1]) : null;
}

export function normalizeAsset(asset: DasAsset): NormalizedMonke | null {
  if (!asset?.id) return null;
  const content = asset.content || {};
  const md = content.metadata || {};
  const name = String(md.name || "").trim() || asset.id.slice(0, 8);
  const image =
    content.links?.image ||
    content.files?.[0]?.cdn_uri ||
    content.files?.[0]?.uri ||
    "";
  let collectionMint: string | null = null;
  for (const g of asset.grouping || []) {
    if (g.group_key === "collection" && g.group_value) {
      collectionMint = g.group_value;
      break;
    }
  }
  const attrs = Array.isArray(md.attributes)
    ? md.attributes.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (a: any) => ({
          trait_type: String(a.trait_type || a.name || "Trait"),
          value: a.value as string | number,
        })
      )
    : [];

  return {
    mint: asset.id,
    name,
    number: extractNumber(name),
    image: typeof image === "string" ? image : "",
    owner: asset.ownership?.owner || null,
    collectionMint,
    attributes: attrs,
    frozen: Boolean(asset.ownership?.frozen),
    compressed: Boolean(asset.compression?.compressed),
    source: "helius",
  };
}

export async function getAsset(mint: string): Promise<NormalizedMonke | null> {
  const result = await heliusRpc<DasAsset>("getAsset", { id: mint });
  return normalizeAsset(result);
}

/**
 * Search monkes owned by wallet, optionally scoped to one collection mint.
 * Uses searchAssets (smaller) — getAssetsByOwner blows Helius size limits.
 */
export async function searchOwnerMonkes(
  owner: string,
  collectionMint?: string
): Promise<NormalizedMonke[]> {
  const all: NormalizedMonke[] = [];
  for (let page = 1; page <= 10; page++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: Record<string, any> = {
      ownerAddress: owner,
      page,
      limit: 200,
      tokenType: "regularNft",
      displayOptions: {
        showCollectionMetadata: false,
      },
    };
    if (collectionMint) {
      params.grouping = ["collection", collectionMint];
    }
    const result = await heliusRpc<{ items?: DasAsset[]; total?: number }>(
      "searchAssets",
      params
    );
    const items = (result?.items || [])
      .map(normalizeAsset)
      .filter(Boolean) as NormalizedMonke[];
    all.push(...items);
    if (items.length < 200) break;
    if (result?.total != null && all.length >= result.total) break;
  }
  return all;
}

/** Fetch monkes for wallet across one collection or all SMB collections */
export async function getWalletMonkes(
  owner: string,
  collectionId: MonkeCollectionId | "all" = "all"
): Promise<NormalizedMonke[]> {
  if (collectionId !== "all") {
    const mint = COLLECTIONS[collectionId].collectionMint;
    const items = await searchOwnerMonkes(owner, mint);
    return filterMonkes(items, { collectionId });
  }

  // Parallel per-collection searches (avoids huge unfiltered wallet dump)
  const batches = await Promise.all(
    ALL_COLLECTION_MINTS.map((m) => searchOwnerMonkes(owner, m))
  );
  const merged = batches.flat();
  // dedupe by mint
  const seen = new Set<string>();
  const out: NormalizedMonke[] = [];
  for (const m of merged) {
    if (seen.has(m.mint)) continue;
    seen.add(m.mint);
    out.push(m);
  }
  return filterMonkes(out, { collectionId: "all" });
}

/** Keep monkes matching collection mint(s) and/or name patterns */
export function filterMonkes(
  items: NormalizedMonke[],
  opts?: {
    collectionId?: MonkeCollectionId | "all";
    collectionMints?: string[];
  }
): NormalizedMonke[] {
  const id = opts?.collectionId ?? "all";
  const mints =
    opts?.collectionMints ||
    (id === "all"
      ? ALL_COLLECTION_MINTS
      : [COLLECTIONS[id].collectionMint]);
  const set = new Set(mints.filter(Boolean));

  return items.filter((m) => {
    if (m.collectionMint && set.has(m.collectionMint)) return true;
    if (id !== "all") {
      return COLLECTIONS[id].namePattern.test(m.name);
    }
    return Object.values(COLLECTIONS).some((c) => c.namePattern.test(m.name));
  });
}

export function detectCollectionFromMonke(
  m: NormalizedMonke
): MonkeCollectionId | null {
  if (m.collectionMint) {
    for (const c of Object.values(COLLECTIONS)) {
      if (c.collectionMint === m.collectionMint) return c.id;
    }
  }
  for (const c of Object.values(COLLECTIONS)) {
    if (c.namePattern.test(m.name)) return c.id;
  }
  return null;
}
