import { NextResponse } from "next/server";
import {
  DONATE_RECIPIENT,
  USDC_MINT,
  YEARLY_GOAL_USD,
} from "@/lib/donate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RPC =
  process.env.HELIUS_RPC_URL ||
  "https://viviyan-bkj12u-fast-mainnet.helius-rpc.com";

async function rpc<T>(method: string, params: unknown): Promise<T> {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: "bal", method, params }),
    next: { revalidate: 30 },
  });
  if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || "RPC error");
  return json.result as T;
}

function lamportsFromBalance(result: unknown): number {
  if (typeof result === "number") return result;
  if (result && typeof result === "object" && "value" in result) {
    const v = (result as { value: unknown }).value;
    if (typeof v === "number") return v;
  }
  return 0;
}

async function solPriceUsd(): Promise<number | null> {
  // Prefer Jupiter (works from CF); CoinGecko often blocked
  try {
    const res = await fetch(
      "https://lite-api.jup.ag/price/v3?ids=So11111111111111111111111111111111111111112",
      { next: { revalidate: 60 }, headers: { Accept: "application/json" } }
    );
    if (res.ok) {
      const j = await res.json();
      const n = Number(
        j?.["So11111111111111111111111111111111111111112"]?.usdPrice ??
          j?.data?.["So11111111111111111111111111111111111111112"]?.price
      );
      if (Number.isFinite(n) && n > 0) return n;
    }
  } catch {
    /* fall through */
  }
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
      { next: { revalidate: 120 }, headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const j = await res.json();
    const n = Number(j?.solana?.usd);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export async function GET() {
  const wallet = DONATE_RECIPIENT;
  try {
    const [balRaw, tokenAccs, price] = await Promise.all([
      rpc<unknown>("getBalance", [wallet]),
      rpc<{
        value: {
          account: {
            data: {
              parsed?: {
                info?: {
                  tokenAmount?: { uiAmount: number | null; decimals: number };
                  mint?: string;
                };
              };
            };
          };
        }[];
      }>("getTokenAccountsByOwner", [
        wallet,
        { mint: USDC_MINT },
        { encoding: "jsonParsed" },
      ]),
      solPriceUsd(),
    ]);

    const sol = lamportsFromBalance(balRaw) / 1e9;
    let usdc = 0;
    for (const row of tokenAccs?.value || []) {
      const amt = row.account?.data?.parsed?.info?.tokenAmount?.uiAmount;
      if (typeof amt === "number") usdc += amt;
    }

    const solUsd = price != null ? sol * price : null;
    const totalUsd =
      solUsd != null ? solUsd + usdc : usdc > 0 ? usdc : sol === 0 && usdc === 0 ? 0 : null;
    const goal = YEARLY_GOAL_USD;
    const progressPct =
      totalUsd != null && goal > 0
        ? Math.min(100, Math.round((totalUsd / goal) * 1000) / 10)
        : null;
    const remainingUsd =
      totalUsd != null
        ? Math.max(0, Math.round((goal - totalUsd) * 100) / 100)
        : goal;

    return NextResponse.json(
      {
        wallet,
        sol,
        usdc,
        solPriceUsd: price,
        solUsd,
        totalUsd,
        yearlyGoalUsd: goal,
        progressPct,
        remainingUsd,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
        },
      }
    );
  } catch (e) {
    return NextResponse.json(
      {
        wallet,
        error: e instanceof Error ? e.message : "balance failed",
        yearlyGoalUsd: YEARLY_GOAL_USD,
      },
      { status: 500 }
    );
  }
}
