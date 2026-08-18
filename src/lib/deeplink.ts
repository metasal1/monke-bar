import type { MonkeCollectionId } from "./collections";

export type PathCollection = "gen2" | "gen3" | "barrel";

export const PATH_TO_COLLECTION: Record<PathCollection, MonkeCollectionId> = {
  gen2: "smb_gen2",
  gen3: "smb_gen3",
  barrel: "smb_barrel",
};

export const COLLECTION_TO_PATH: Record<
  Exclude<MonkeCollectionId, never>,
  PathCollection
> = {
  smb_gen2: "gen2",
  smb_gen3: "gen3",
  smb_barrel: "barrel",
};

export function isPathCollection(s: string): s is PathCollection {
  return s === "gen2" || s === "gen3" || s === "barrel";
}

/** Canonical monke page path e.g. /gen3/12192 */
export function monkePath(
  collectionId: MonkeCollectionId | "all" | null | undefined,
  num: number | null | undefined,
  mint?: string | null
): string | null {
  if (num != null && collectionId && collectionId !== "all") {
    const slug = COLLECTION_TO_PATH[collectionId];
    if (slug) return `/${slug}/${num}`;
  }
  if (mint) return `/mint/${mint}`;
  return null;
}

export function monkeAbsoluteUrl(
  collectionId: MonkeCollectionId | "all" | null | undefined,
  num: number | null | undefined,
  mint?: string | null
): string | null {
  const p = monkePath(collectionId, num, mint);
  if (!p) return null;
  return `https://monke.bar${p}`;
}
