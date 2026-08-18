export const runtime = "nodejs";
export const dynamic = "force-static";

const BODY = `# monke.bar

> Pixel Solana Monkey Business (SMB) lookup bar — Gen2, Gen3, Barrel.

## Site
- Home: https://monke.bar/
- Metasal monke: https://monke.bar/gen3/12192
- Full LLM notes: https://monke.bar/llms-full.txt

## Deeplinks
- Gen2: https://monke.bar/gen2/{number}
- Gen3: https://monke.bar/gen3/{number}
- Barrel: https://monke.bar/barrel/{number}
- Mint: https://monke.bar/mint/{mintAddress}

## APIs
- GET /api/lookup?q={#|mint|wallet|.sol}&collection={smb_gen2|smb_gen3|smb_barrel|all}
- GET /api/floor?collection={smb_gen2|smb_gen3|smb_barrel}

## Data sources
- Helius DAS
- Collection mint indexes
- Magic Eden floor stats
- SNS (Bonfida)

## Maker
- https://metasal.xyz
`;

export function GET() {
  return new Response(BODY, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
