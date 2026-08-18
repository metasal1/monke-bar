# monke.bar

Solana Monkey Business (SMB) NFT collection lookup.

## Lookup

- **Monke #** — `1355`, `#1355`, `SMB #1355`
- **Mint** — base58 mint address
- **Wallet** — base58 wallet (lists SMB monkes)

## Stack

- Next.js 15 (App Router)
- Helius DAS (`getAsset`, `getAssetsByOwner`)
- HowRare (rank + #→mint map)
- Magic Eden (floor / listed / 24h vol)

## Dev

```bash
cd /Volumes/PRO-G40/workspace/monke-bar
npm run dev
```

Env (optional):

```
HELIUS_RPC_URL=https://…helius-rpc.com/?api-key=…
```

Default falls back to the shared fast Helius endpoint used by other Milysec apps.

## Deploy

Vercel project → attach `monke.bar`. Preview via CF tunnel before PR.
