import { COLLECTIONS, type MonkeCollectionId } from "./collections";

export interface FloorStats {
  symbol: string;
  floorSol: number | null;
  listedCount: number | null;
  volume24hSol: number | null;
  avgPrice24hSol: number | null;
  floorMint: string | null;
}

function lamportsToSol(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  // ME often returns lamports for floor
  return n > 1000 ? n / 1e9 : n;
}

export async function getMeFloor(
  collectionId: MonkeCollectionId = "smb_gen2"
): Promise<FloorStats | null> {
  const symbol = COLLECTIONS[collectionId].meSymbol;
  if (!symbol) return null;

  try {
    const res = await fetch(
      `https://api-mainnet.magiceden.io/rpc/getCollectionEscrowStats/${symbol}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "monke.bar/0.1",
        },
        next: { revalidate: 60 },
      }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const r = json?.results || json;
    return {
      symbol,
      floorSol: lamportsToSol(r.floorPrice),
      listedCount: r.listedCount != null ? Number(r.listedCount) : null,
      volume24hSol: lamportsToSol(r.volume24hr),
      avgPrice24hSol: lamportsToSol(r.avgPrice24hr),
      floorMint: r.floorNFT?.mintAddress || null,
    };
  } catch {
    return null;
  }
}
