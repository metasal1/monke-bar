/** monke.bar keep-online donations via Solana Pay (USDC) */

/** Runway wallet — show balance + accept tips */
export const DONATE_RECIPIENT =
  process.env.NEXT_PUBLIC_DONATE_RECIPIENT ||
  "9Sjoqhs9F2Sstu9tnT2HLu8sCHUmhMMQYXh8xsGNZUcq";

/** Mainnet USDC mint */
export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

/** Yearly operating target (USD) */
export const YEARLY_GOAL_USD = 55;

export const MIN_DONATE_USD = 1;
export const MAX_DONATE_USD = 55;

/**
 * Solana Pay transfer request — $N USDC.
 * Spec: solana:<recipient>?amount=<ui>&spl-token=<mint>&label=&message=&memo=
 */
export function buildSolanaPayUsdcUrl(opts: {
  amountUsd: number;
  recipient?: string;
}): string {
  const amount = Math.min(
    MAX_DONATE_USD,
    Math.max(MIN_DONATE_USD, Math.round(opts.amountUsd * 100) / 100)
  );
  const recipient = opts.recipient || DONATE_RECIPIENT;
  const params = new URLSearchParams({
    amount: String(amount),
    "spl-token": USDC_MINT,
    label: "monke.bar",
    message: `Keep monke.bar online · $${amount} toward $${YEARLY_GOAL_USD}/yr`,
    memo: `monke.bar donate $${amount}`,
  });
  return `solana:${recipient}?${params.toString()}`;
}

export function shortAddr(a: string, n = 4) {
  if (!a || a.length < 10) return a;
  return `${a.slice(0, n)}…${a.slice(-n)}`;
}
