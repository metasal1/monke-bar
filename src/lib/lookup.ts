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
import type { FloorStats } from "./magiceden";
import { looksLikeSns, resolveSns } from "./sns";

export type LookupKind = "mint" | "number" | "wallet" | "sns" | "unknown";

export interface LookupResult {
  kind: LookupKind;
  query: string;
  monke: NormalizedMonke | null;
  monkes: NormalizedMonke[];
  rarity: HowrareItem | null;
  /** Always null on hot path — floors load via /api/floor when needed */
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
    opts?.collectionId || hint || "smb_gen3";

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

  // SNS
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
        error:
          e instanceof Error
            ? `SNS resolve failed: ${e.message}`
            : "SNS resolve failed",
      };
    }
    try {
      return await walletLookup(owner, collectionId, {
        ...base,
        kind: "sns",
        resolvedDomain: domain,
        resolvedWallet: owner,
      });
    } catch (e) {
      return {
        ...base,
        kind: "sns",
        resolvedDomain: domain,
        resolvedWallet: owner,
        error:
          e instanceof Error
            ? `Wallet scan failed: ${e.message}`
            : "Wallet scan failed",
      };
    }
  }

  const num = parseMonkeNumber(query);

  // Number — index first (fast), DAS for live owner/image
  if (num != null) {
    const cid: MonkeCollectionId =
      collectionId === "all" ? hint || "smb_gen3" : collectionId;
    const rarity = await howrareByNumber(cid, num);
    if (!rarity?.mint) {
      const st = indexStats(cid);
      return {
        ...base,
        kind: "number",
        collectionId: cid,
        indexPartial: st.partial,
        indexCount: st.count,
        error: st.partial
          ? `No mint in index for ${COLLECTIONS[cid].shortName} #${num} (index has ${st.count}/${COLLECTIONS[cid].supply} — try mint address)`
          : `No mint found for ${COLLECTIONS[cid].shortName} #${num}`,
      };
    }

    // Prefer index image immediately; brief DAS enrich (owner) with timeout
    let monke: NormalizedMonke = {
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

    try {
      const live = await Promise.race([
        getAsset(rarity.mint),
        new Promise<null>((r) => setTimeout(() => r(null), 900)),
      ]);
      if (live) {
        monke = {
          ...live,
          number: live.number ?? num,
          name: live.name || rarity.name,
          image: live.image || rarity.image,
        };
      }
    } catch {
      /* keep index-backed monke */
    }

    return {
      kind: "number",
      query,
      monke,
      monkes: [monke],
      rarity,
      floor: null,
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
        detected || (collectionId === "all" ? "smb_gen3" : collectionId);
      const rarity = await attachRarity(monke, cid);
      return {
        kind: "mint",
        query,
        monke,
        monkes: [monke],
        rarity,
        floor: null,
        collectionId: detected || cid,
      };
    }

    try {
      return await walletLookup(query, collectionId, {
        ...base,
        kind: "wallet",
      });
    } catch (e) {
      return {
        ...base,
        kind: "wallet",
        error:
          e instanceof Error ? e.message : "Wallet scan failed",
      };
    }
  }

  // bare base58-ish fallthrough as wallet
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(query)) {
    try {
      return await walletLookup(query, collectionId, {
        ...base,
        kind: "wallet",
      });
    } catch (e) {
      return {
        ...base,
        kind: "wallet",
        error: e instanceof Error ? e.message : "Wallet scan failed",
      };
    }
  }

  return { ...base, error: "Unrecognized query" };
}
