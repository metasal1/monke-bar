/** monke.bar keep-online donations via Solana Pay (USDC) */

/** metasal.sol — primary tip jar */
export const DONATE_RECIPIENT =
  process.env.NEXT_PUBLIC_DONATE_RECIPIENT ||
  "GaxVqiQyJKQDRu6H4pfy9V6Xq19pHGr6HQKDQDv911Y4";

/** Mainnet USDC mint */
export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

export const USD_PER_MONKE = 1;
export const MIN_MONKES = 1;
export const MAX_MONKES = 50;

export function usdForMonkes(n: number): number {
  const x = Math.min(MAX_MONKES, Math.max(MIN_MONKES, Math.round(n)));
  return x * USD_PER_MONKE;
}

/**
 * Solana Pay transfer request — $N USDC.
 * Spec: solana:<recipient>?amount=<ui>&spl-token=<mint>&label=&message=&memo=
 */
export function buildSolanaPayUsdcUrl(opts: {
  monkes: number;
  recipient?: string;
}): string {
  const monkes = Math.min(
    MAX_MONKES,
    Math.max(MIN_MONKES, Math.round(opts.monkes))
  );
  const amount = usdForMonkes(monkes);
  const recipient = opts.recipient || DONATE_RECIPIENT;
  const params = new URLSearchParams({
    amount: String(amount),
    "spl-token": USDC_MINT,
    label: "monke.bar",
    message: `Keep monke.bar online · ${monkes} monke${monkes === 1 ? "" : "s"} · $${amount}/yr`,
    memo: `monke.bar x${monkes}`,
  });
  return `solana:${recipient}?${params.toString()}`;
}
