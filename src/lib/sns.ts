import { Connection } from "@solana/web3.js";
import { resolve } from "@bonfida/spl-name-service";
import { BASE58_RE } from "./collections";
import { looksLikeMonkeSol } from "./monke-sol";

/** Prefer public RPCs for SNS — Bonfida does many reads; paid Helius keys often 403/504 here */
const RPC_CANDIDATES = [
  "https://solana-rpc.publicnode.com",
  "https://api.mainnet-beta.solana.com",
  process.env.SOLANA_RPC_URL,
  process.env.HELIUS_RPC_URL,
  "https://viviyan-bkj12u-fast-mainnet.helius-rpc.com",
].filter(Boolean) as string[];

export interface SnsResolveResult {
  domain: string;
  owner: string;
}

/** True if query looks like SNS (.sol) rather than base58 */
export function looksLikeSns(q: string): boolean {
  const s = q.trim().toLowerCase().replace(/^@/, "");
  if (!s || BASE58_RE.test(s)) return false;
  if (looksLikeMonkeSol(s)) return true;
  if (s.endsWith(".sol")) return true;
  // multi-label SNS: a.b.sol already covered; a.b without .sol
  if (/^[a-z0-9][a-z0-9\-_]*(\.[a-z0-9][a-z0-9\-_]*)+$/i.test(s)) {
    return true;
  }
  if (/^[a-z0-9][a-z0-9\-_]{0,62}$/i.test(s) && /[a-z]/i.test(s)) {
    if (["gen2", "gen3", "barrel", "smb", "all"].includes(s)) {
      return false;
    }
    // bare "monke" is the monke.sol SNS name
    return true;
  }
  return false;
}

/**
 * Resolve SNS domain to wallet owner.
 * Accepts: "toly", "toly.sol", "sub.parent.sol", "foo.monke.sol", "monke"
 */
export async function resolveSns(raw: string): Promise<SnsResolveResult> {
  const domain = raw.trim().toLowerCase().replace(/^@/, "");
  if (!domain) throw new Error("Empty domain");

  const display = domain.endsWith(".sol") ? domain : `${domain}.sol`;
  // Bonfida resolve takes name without trailing .sol, keeps parent.child form
  const forResolve = display.replace(/\.sol$/, "");

  const errors: string[] = [];
  for (const rpc of RPC_CANDIDATES) {
    try {
      const connection = new Connection(rpc, "confirmed");
      const owner = await Promise.race([
        resolve(connection, forResolve),
        new Promise<never>((_, rej) =>
          setTimeout(() => rej(new Error(`timeout ${rpc}`)), 12_000)
        ),
      ]);
      return { domain: display, owner: owner.toBase58() };
    } catch (e) {
      errors.push(
        `${rpc.split("?")[0]}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  throw new Error(`SNS resolve failed (${errors.join(" | ")})`);
}
