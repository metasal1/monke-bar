import {
  COLLECTIONS,
  isMintAddress,
  parseCollectionHint,
  parseMonkeNumber,
  type MonkeCollectionId,
} from "./collections";
import {
  detectCollectionFromMonke,
  getAsset,
  getWalletMonkes,
  type NormalizedMonke,
} from "./helius";
import {
  collectionIdForMint,
  howrareByMint,
  howrareByNumber,
  indexStats,
  type HowrareItem,
} from "./howrare";
import { getMeFloor, type FloorStats } from "./magiceden";
import { looksLikeSns, resolveSns } from "./sns";

export type LookupKind = "mint" | "number" | "wallet" | "sns" | "unknown";

export interface LookupResult {
  kind: LookupKind;
  query: string;
  monke: NormalizedMonke | null;
  monkes: NormalizedMonke[];
  rarity: HowrareItem | null;
  floor: FloorStats | null;
  collectionId: MonkeCollectionId | "all" | null;
  resolvedWallet?: string;
  resolvedDomain?: string;
  indexPartial?: boolean;
  indexCount?: number;
  error?: string;
}

function looksLikeSmb(monke: NormalizedMonke): boolean {
  return detectCollectionFromMonke(monke) != null;
}

async function attachRarity(
  monke: NormalizedMonke,
  collectionId: MonkeCollectionId
): Promise<HowrareItem | null> {
  return (
    (await howrareByMint(collectionId, monke.mint)) ||
    (monke.number != null
      ? await howrareByNumber(collectionId, monke.number)
      : null)
  );
}

async function walletLookup(
  wallet: string,
  collectionId: MonkeCollectionId | "all",
  base: LookupResult
): Promise<LookupResult> {
  const monkes = await getWalletMonkes(wallet, collectionId);
  monkes.sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
  return {
    ...base,
    kind: base.kind === "sns" ? "sns" : "wallet",
    monke: monkes[0] || null,
    monkes,
    resolvedWallet: wallet,
    error: monkes.length
      ? undefined
      : collectionId === "all"
        ? "No SMB monkes found in this wallet"
        : `No ${COLLECTIONS[collectionId].shortName} monkes found in this wallet`,
  };
}

export async function lookupMonke(
  rawQuery: string,
  opts?: {
    preferWallet?: boolean;
    collectionId?: MonkeCollectionId | "all";
  }
): Promise<LookupResult> {
  const query = rawQuery.trim();
  const hint = parseCollectionHint(query);
  const collectionId: MonkeCollectionId | "all" =
    opts?.collectionId || hint || "smb_gen2";

  const floorCollection: MonkeCollectionId =
    collectionId === "all" ? "smb_gen2" : collectionId;

  const stats = collectionId === "all" ? null : indexStats(collectionId);

  const base: LookupResult = {
    kind: "unknown",
    query,
    monke: null,
    monkes: [],
    rarity: null,
    floor: null,
    collectionId,
    indexPartial: stats?.partial,
    indexCount: stats?.count,
  };

  if (!query) {
    return { ...base, error: "Empty query" };
  }

  const floorP = getMeFloor(floorCollection);

  // SNS first (toly.sol / name)
  if (looksLikeSns(query)) {
    let domain: string;
    let owner: string;
    try {
      const resolved = await resolveSns(query);
      domain = resolved.domain;
      owner = resolved.owner;
    } catch (e) {
      return {
        ...base,
        kind: "sns",
        floor: await floorP,
        error:
          e instanceof Error
            ? `SNS resolve failed: ${e.message}`
            : "SNS resolve failed",
      };
    }
    try {
      const result = await walletLookup(owner, collectionId, {
        ...base,
        kind: "sns",
        resolvedDomain: domain,
        resolvedWallet: owner,
      });
      return { ...result, floor: await floorP };
    } catch (e) {
      return {
        ...base,
        kind: "sns",
        resolvedDomain: domain,
        resolvedWallet: owner,
        floor: await floorP,
        error:
          e instanceof Error
            ? `Wallet scan failed: ${e.message}`
            : "Wallet scan failed",
      };
    }
  }

  const num = parseMonkeNumber(query);

  // Number lookup — needs concrete collection (default Gen2)
  if (num != null) {
    const cid: MonkeCollectionId =
      collectionId === "all" ? hint || "smb_gen2" : collectionId;
    const rarity = await howrareByNumber(cid, num);
    if (!rarity?.mint) {
      const st = indexStats(cid);
      return {
        ...base,
        kind: "number",
        collectionId: cid,
        floor: await floorP,
        indexPartial: st.partial,
        indexCount: st.count,
        error: st.partial
          ? `No mint in index for ${COLLECTIONS[cid].shortName} #${num} (index has ${st.count}/${COLLECTIONS[cid].supply} — try mint address)`
          : `No mint found for ${COLLECTIONS[cid].shortName} #${num}`,
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
        collectionMint: COLLECTIONS[cid].collectionMint,
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
      collectionId: cid,
      indexPartial: indexStats(cid).partial,
      indexCount: indexStats(cid).count,
    };
  }

  if (isMintAddress(query)) {
    let monke: NormalizedMonke | null = null;
    try {
      monke = await getAsset(query);
    } catch {
      monke = null;
    }

    const detected =
      (monke && detectCollectionFromMonke(monke)) ||
      collectionIdForMint(query);

    const asNft =
      monke &&
      (looksLikeSmb(monke) ||
        monke.attributes.length > 0 ||
        Boolean(monke.image));

    if (asNft && monke && !opts?.preferWallet) {
      const cid =
        detected ||
        (collectionId === "all" ? "smb_gen2" : collectionId);
      const rarity = await attachRarity(monke, cid);
      return {
        kind: "mint",
        query,
        monke,
        monkes: [monke],
        rarity,
        floor: await getMeFloor(cid),
        collectionId: detected || cid,
      };
    }

    // Treat as wallet
    try {
      const result = await walletLookup(query, collectionId, {
        ...base,
        kind: "wallet",
      });
      return { ...result, floor: await floorP };
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
    error: "Enter monke #, mint, wallet, or SNS (.sol)",
  };
}
