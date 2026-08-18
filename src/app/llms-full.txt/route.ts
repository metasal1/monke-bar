export const runtime = "nodejs";
export const dynamic = "force-static";

const BODY = `# monke.bar — full reference

Unofficial Solana Monkey Business lookup tool.

## Collections
| ID | Path | ME symbol | Tensor | Collection mint |
|----|------|-----------|--------|-----------------|
| smb_gen2 | /gen2/{n} | solana_monkey_business | smb_gen2 | SMBtHCCC6RYRutFEPb4gZqeBLUZbMNhRKaMKZZLHi7W |
| smb_gen3 | /gen3/{n} | smb_gen3 | smb_gen3 | 8Rt3Ayqth4DAiPnW9MDFi63TiQJHmohfTWLMQFHi4KZH |
| smb_barrel | /barrel/{n} | smb_barrel | smb_barrel | Ce92PLCQrz2gLNAE5DFovvmpoeLBLtpTzqqeD4Px76hp |

## Lookup query shapes
- Number: 1355, #1355, SMB #1355, gen3 20, barrel 430
- Mint: base58
- Wallet: base58
- SNS: toly.sol or toly

## Marketplace refs (Metasal)
- Tensor item: https://www.tensor.trade/item/{mint}?ref=LCY617
- Tensor trade: https://www.tensor.trade/trade/{slug}?ref=LCY617
- Magic Eden item: https://magiceden.io/item-details/{mint}?utm_source=metasal&utm_medium=referral&utm_campaign=monke.bar
- Magic Eden market: https://magiceden.io/marketplace/{symbol}?utm_source=metasal&utm_medium=referral&utm_campaign=monke.bar

## House monke
- SMB Gen3 #12192
- https://monke.bar/gen3/12192
- mint 85kc8h9QjHbwahhaYB5Funx9cjXnQE3zJX1HdeJQBgWu

## Official SMB
- https://solanamonkey.business/

## Contact / maker
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
