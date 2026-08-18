import {
  COLLECTIONS,
  SMB_GEN2_COLLECTION,
  isMintAddress,
  parseMonkeNumber,
  type MonkeCollectionId,
} from "./collections";
import {
  filterMonkes,
  getAsset,
  getAssetsByOwner,
  type NormalizedMonke,
} from "./helius";
import { howrareByMint, howrareByNumber, type HowrareItem } from "./howrare";
import { getMeFloor, type FloorStats } from "./magiceden";

export type LookupKind = "mint" | "number" | "wallet" | "unknown";

export interface LookupResult {
  kind: LookupKind;
  query: string;
  monke: NormalizedMonke | null;
  monkes: NormalizedMonke[];
  rarity: HowrareItem | null;
  floor: FloorStats | null;
  collectionId: MonkeCollectionId | null;
  error?: string;
}

function detectKind(q: string): LookupKind {
  const t = q.trim();
  if (!t) return "unknown";
  if (parseMonkeNumber(t) != null) return "number";
  if (isMintAddress(t)) return "mint"; // mint vs wallet disambiguated later
  return "unknown";
}

function looksLikeSmb(monke: NormalizedMonke): boolean {
  if (monke.collectionMint === SMB_GEN2_COLLECTION) return true;
  return /^smb\s*#?\d+/i.test(monke.name) || /monkey/i.test(monke.name);
}

export async function lookupMonke(
  rawQuery: string,
  opts?: { preferWallet?: boolean; collectionId?: MonkeCollectionId }
): Promise<LookupResult> {
  const query = rawQuery.trim();
  const collectionId = opts?.collectionId || "smb_gen2";
  const base: LookupResult = {
    kind: "unknown",
    query,
    monke: null,
    monkes: [],
    rarity: null,
    floor: null,
    collectionId,
  };

  if (!query) {
    return { ...base, error: "Empty query" };
  }

  const floorP = getMeFloor(collectionId);
  const num = parseMonkeNumber(query);

  // Number lookup via HowRare → mint → Helius
  if (num != null) {
    const rarity = await howrareByNumber(collectionId, num);
    if (!rarity?.mint) {
      return {
        ...base,
        kind: "number",
        floor: await floorP,
        error: `No mint found for ${COLLECTIONS[collectionId].shortName} #${num}`,
      };
    }
    let monke: NormalizedMonke | null = null;
    try {
      monke = await getAsset(rarity.mint);
    } catch {
      monke = {
        mint: rarity.mint,
        name: rarity.name,
        number: num,
        image: rarity.image,
        owner: null,
        collectionMint: COLLECTIONS[collectionId].collectionMint || null,
        attributes: rarity.attributes.map((a) => ({
          trait_type: a.name,
          value: a.value,
        })),
        frozen: false,
        compressed: false,
        source: "helius",
      };
    }
    return {
      kind: "number",
      query,
      monke,
      monkes: monke ? [monke] : [],
      rarity,
      floor: await floorP,
      collectionId,
    };
  }

  if (isMintAddress(query)) {
    // Try as NFT mint first
    let monke: NormalizedMonke | null = null;
    try {
      monke = await getAsset(query);
    } catch {
      monke = null;
    }

    const asNft =
      monke &&
      (looksLikeSmb(monke) ||
        monke.attributes.length > 0 ||
        Boolean(monke.image));

    if (asNft && monke && !opts?.preferWallet) {
      const rarity =
        (await howrareByMint(collectionId, monke.mint)) ||
        (monke.number != null
          ? await howrareByNumber(collectionId, monke.number)
          : null);
      return {
        kind: "mint",
        query,
        monke,
        monkes: [monke],
        rarity,
        floor: await floorP,
        collectionId: looksLikeSmb(monke) ? collectionId : null,
      };
    }

    // Treat as wallet
    try {
      const { items } = await getAssetsByOwner(query, 1, 200);
      const monkes = filterMonkes(items, [
        SMB_GEN2_COLLECTION,
        COLLECTIONS.smb_gen3.collectionMint || "",
      ]);
      return {
        kind: "wallet",
        query,
        monke: monkes[0] || null,
        monkes,
        rarity: null,
        floor: await floorP,
        collectionId,
        error: monkes.length ? undefined : "No SMB monkes found in this wallet",
      };
    } catch (e) {
      return {
        ...base,
        kind: monke ? "mint" : "wallet",
        monke,
        monkes: monke ? [monke] : [],
        floor: await floorP,
        error:
          monke == null
            ? e instanceof Error
              ? e.message
              : "Lookup failed"
            : undefined,
      };
    }
  }

  return {
    ...base,
    floor: await floorP,
    error:
      "Enter a monke # (e.g. 1355), mint address, or wallet address",
  };
}
