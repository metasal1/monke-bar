/** Official Solana Monkey Business (SMB) collections */

export type MonkeCollectionId = "smb_gen2" | "smb_gen3" | "smb_barrel";

export interface MonkeCollection {
  id: MonkeCollectionId;
  name: string;
  shortName: string;
  /** Metaplex verified collection mint */
  collectionMint: string;
  /** Magic Eden marketplace symbol */
  meSymbol: string;
  /** HowRare collection slug (if any) */
  howrareSlug?: string;
  supply: number;
  /** Display name regex for wallet filter */
  namePattern: RegExp;
  numberPrefix: string;
  officialSite: string;
  /** Index may be incomplete (DAS/HowRare gaps) */
  partialIndex?: boolean;
}

export const COLLECTIONS: Record<MonkeCollectionId, MonkeCollection> = {
  smb_gen2: {
    id: "smb_gen2",
    name: "SMB Gen2",
    shortName: "Gen2",
    collectionMint: "SMBtHCCC6RYRutFEPb4gZqeBLUZbMNhRKaMKZZLHi7W",
    meSymbol: "solana_monkey_business",
    howrareSlug: "smb",
    supply: 5000,
    namePattern: /^SMB\s*#\s*\d+/i,
    numberPrefix: "SMB",
    officialSite: "https://solanamonkey.business/",
  },
  smb_gen3: {
    id: "smb_gen3",
    name: "SMB Gen3",
    shortName: "Gen3",
    collectionMint: "8Rt3Ayqth4DAiPnW9MDFi63TiQJHmohfTWLMQFHi4KZH",
    meSymbol: "smb_gen3",
    howrareSlug: "smbgen3",
    supply: 15000,
    namePattern: /SMB\s*Gen3\s*#\s*\d+/i,
    numberPrefix: "SMB Gen3",
    officialSite: "https://solanamonkey.business/",
    partialIndex: true,
  },
  smb_barrel: {
    id: "smb_barrel",
    name: "SMB Barrel",
    shortName: "Barrel",
    collectionMint: "Ce92PLCQrz2gLNAE5DFovvmpoeLBLtpTzqqeD4Px76hp",
    meSymbol: "smb_barrel",
    supply: 5000,
    namePattern: /Barrel\s*#\s*\d+/i,
    numberPrefix: "SMB Gen3 Barrel",
    officialSite: "https://solanamonkey.business/",
    partialIndex: true,
  },
};

export const ALL_COLLECTION_MINTS = Object.values(COLLECTIONS).map(
  (c) => c.collectionMint
);

export const COLLECTION_IDS = Object.keys(COLLECTIONS) as MonkeCollectionId[];

export function isCollectionId(v: string): v is MonkeCollectionId {
  return v in COLLECTIONS;
}

export const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function isMintAddress(q: string): boolean {
  return BASE58_RE.test(q.trim());
}

/** Parse monke number from "#1355", "1355", "SMB #1355", "gen3 20", "barrel 430" */
export function parseMonkeNumber(q: string): number | null {
  const s = q.trim();
  const m =
    s.match(/^#?\s*(\d{1,5})$/i) ||
    s.match(/^smb(?:\s*gen\s*2)?\s*#?\s*(\d{1,5})$/i) ||
    s.match(/^gen\s*2\s*#?\s*(\d{1,5})$/i) ||
    s.match(/^smb\s*gen\s*3\s*#?\s*(\d{1,5})$/i) ||
    s.match(/^gen\s*3\s*#?\s*(\d{1,5})$/i) ||
    s.match(/^(?:smb\s*)?barrel\s*#?\s*(\d{1,5})$/i) ||
    s.match(/^monke\s*#?\s*(\d{1,5})$/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n < 1 || n > 20000) return null;
  return n;
}

/** Detect collection hint from query text (optional) */
export function parseCollectionHint(q: string): MonkeCollectionId | null {
  const s = q.trim().toLowerCase();
  if (/barrel/.test(s)) return "smb_barrel";
  if (/gen\s*3|gen3/.test(s)) return "smb_gen3";
  if (/gen\s*2|gen2/.test(s) || /^smb\s*#?\s*\d+$/.test(s)) return "smb_gen2";
  return null;
}
