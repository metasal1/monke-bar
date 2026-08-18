/** Official Solana Monkey Business (SMB) collections */

export type MonkeCollectionId = "smb_gen2" | "smb_gen3" | "smb_barrel";

export interface MonkeCollection {
  id: MonkeCollectionId;
  name: string;
  shortName: string;
  /** Metaplex verified collection mint (when known) */
  collectionMint?: string;
  /** Magic Eden marketplace symbol */
  meSymbol?: string;
  /** HowRare collection slug */
  howrareSlug?: string;
  /** Tensor slug */
  tensorSlug?: string;
  supply?: number;
  officialSite?: string;
}

export const COLLECTIONS: Record<MonkeCollectionId, MonkeCollection> = {
  smb_gen2: {
    id: "smb_gen2",
    name: "SMB Gen2",
    shortName: "Gen2",
    collectionMint: "SMBtHCCC6RYRutFEPb4gZqeBLUZbMNhRKaMKZZLHi7W",
    meSymbol: "solana_monkey_business",
    howrareSlug: "smb",
    tensorSlug: "smb_gen2",
    supply: 5000,
    officialSite: "https://solanamonkey.business/",
  },
  smb_gen3: {
    id: "smb_gen3",
    name: "SMB Gen3",
    shortName: "Gen3",
    meSymbol: "smb_gen3",
    howrareSlug: "smbgen3",
    tensorSlug: "smb_gen3",
    supply: 15000,
    officialSite: "https://solanamonkey.business/",
  },
  smb_barrel: {
    id: "smb_barrel",
    name: "SMB Barrel",
    shortName: "Barrel",
    meSymbol: "smb_barrel",
    tensorSlug: "smb_barrel",
    supply: 5000,
    officialSite: "https://solanamonkey.business/",
  },
};

export const SMB_GEN2_COLLECTION =
  COLLECTIONS.smb_gen2.collectionMint as string;

export const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function isMintAddress(q: string): boolean {
  return BASE58_RE.test(q.trim());
}

/** Parse monke number from "#1355", "1355", "SMB #1355", "smb 1355" */
export function parseMonkeNumber(q: string): number | null {
  const s = q.trim();
  const m =
    s.match(/^#?\s*(\d{1,5})$/i) ||
    s.match(/^smb\s*#?\s*(\d{1,5})$/i) ||
    s.match(/^gen2\s*#?\s*(\d{1,5})$/i) ||
    s.match(/^monke\s*#?\s*(\d{1,5})$/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n < 1 || n > 20000) return null;
  return n;
}

export function isWalletAddress(q: string): boolean {
  return isMintAddress(q); // same shape; context decides
}
