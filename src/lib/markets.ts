/** Marketplace deep links with Metasal referral params */

export const TENSOR_REF = "LCY617";
export const ME_UTM = "utm_source=metasal&utm_medium=referral&utm_campaign=monke.bar";

export type MarketCollection =
  | "smb_gen2"
  | "smb_gen3"
  | "smb_barrel"
  | "all"
  | null
  | undefined;

const ME_SYMBOL: Record<string, string> = {
  smb_gen2: "solana_monkey_business",
  smb_gen3: "smb_gen3",
  smb_barrel: "smb_barrel",
};

const TENSOR_SLUG: Record<string, string> = {
  smb_gen2: "smb_gen2",
  smb_gen3: "smb_gen3",
  smb_barrel: "smb_barrel",
};

export function meItemUrl(mint: string): string {
  return `https://magiceden.io/item-details/${mint}?${ME_UTM}`;
}

export function tensorItemUrl(mint: string): string {
  return `https://www.tensor.trade/item/${mint}?ref=${TENSOR_REF}`;
}

export function meCollectionUrl(collectionId: MarketCollection): string | null {
  if (!collectionId || collectionId === "all") return null;
  const sym = ME_SYMBOL[collectionId];
  if (!sym) return null;
  return `https://magiceden.io/marketplace/${sym}?${ME_UTM}`;
}

export function tensorCollectionUrl(
  collectionId: MarketCollection
): string | null {
  if (!collectionId || collectionId === "all") return null;
  const slug = TENSOR_SLUG[collectionId];
  if (!slug) return null;
  return `https://www.tensor.trade/trade/${slug}?ref=${TENSOR_REF}`;
}

export function meHomeUrl(): string {
  return `https://magiceden.io/?${ME_UTM}`;
}

export function tensorHomeUrl(): string {
  return `https://www.tensor.trade/?ref=${TENSOR_REF}`;
}
