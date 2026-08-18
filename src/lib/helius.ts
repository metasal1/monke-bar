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

export async function getAssetsByOwner(
  owner: string,
  page = 1,
  limit = 100
): Promise<{ items: NormalizedMonke[]; total: number }> {
  const result = await heliusRpc<{ items?: DasAsset[]; total?: number }>(
    "getAssetsByOwner",
    {
      ownerAddress: owner,
      page,
      limit,
      displayOptions: {
        showCollectionMetadata: true,
      },
    }
  );
  const items = (result?.items || [])
    .map(normalizeAsset)
    .filter(Boolean) as NormalizedMonke[];
  return { items, total: result?.total ?? items.length };
}

/** Keep monkes: SMB name pattern or known collection mints */
export function filterMonkes(
  items: NormalizedMonke[],
  collectionMints: string[] = []
): NormalizedMonke[] {
  const set = new Set(collectionMints.filter(Boolean));
  return items.filter((m) => {
    if (m.collectionMint && set.has(m.collectionMint)) return true;
    const n = m.name.toLowerCase();
    return (
      /^smb\s*#?\d+/i.test(m.name) ||
      n.includes("smb gen") ||
      n.startsWith("smb ") ||
      (n.includes("barrel") && n.includes("smb")) ||
      /^monke\s*#?\d+/i.test(m.name)
    );
  });
}
