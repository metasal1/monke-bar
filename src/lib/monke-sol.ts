/**
 * monke.sol SNS / host helpers.
 *
 * Public ICANN DNS does not serve monke.sol (it's SNS). Gateways and
 * custom resolvers that hit this Worker with Host monke.sol / *.monke.sol
 * get deeplink rewrites + SNS resolve still works for name.monke.sol.
 */

export type MonkeSolRoute =
  | { kind: "home" }
  | { kind: "path"; path: string }
  | { kind: "sns"; domain: string }
  | { kind: "query"; q: string; collection?: string };

const BASE_HOSTS = new Set([
  "monke.sol",
  "www.monke.sol",
]);

/** Host is monke.sol or any subdomain of monke.sol */
export function isMonkeSolHost(host: string): boolean {
  const h = host.toLowerCase().split(":")[0];
  if (BASE_HOSTS.has(h)) return true;
  return h.endsWith(".monke.sol");
}

/**
 * Map Host header → internal path/query.
 *
 * Examples:
 *   monke.sol                         → /
 *   1355.monke.sol                    → /gen2/1355
 *   gen3-12192.monke.sol              → /gen3/12192
 *   barrel-430.monke.sol              → /barrel/430
 *   gen3.12192.monke.sol              → /gen3/12192
 *   12192.gen3.monke.sol              → /gen3/12192
 *   toly.monke.sol                    → /?q=toly.monke.sol&collection=all
 *   mint-85kc….monke.sol              → /mint/85kc…
 */
export function routeMonkeSolHost(host: string): MonkeSolRoute {
  const h = host.toLowerCase().split(":")[0];
  if (h === "monke.sol" || h === "www.monke.sol") return { kind: "home" };

  if (!h.endsWith(".monke.sol")) return { kind: "home" };

  const sub = h.slice(0, -".monke.sol".length); // e.g. gen3-12192 | 1355 | a.b
  if (!sub) return { kind: "home" };

  // mint-<base58>
  const mintM = sub.match(/^mint-([1-9A-HJ-NP-Za-km-z]{32,44})$/);
  if (mintM) return { kind: "path", path: `/mint/${mintM[1]}` };

  // gen2-1355 | gen3-12192 | barrel-430 | g2-1 | g3-20
  const dashed = sub.match(
    /^(gen2|gen3|barrel|g2|g3|b)[_-]?(\d{1,5})$/i
  );
  if (dashed) {
    const col = normalizeCol(dashed[1]);
    return { kind: "path", path: `/${col}/${dashed[2]}` };
  }

  // gen3.12192 or 12192.gen3
  const parts = sub.split(".").filter(Boolean);
  if (parts.length === 2) {
    const [a, b] = parts;
    if (/^\d{1,5}$/.test(a) && isColToken(b)) {
      return { kind: "path", path: `/${normalizeCol(b)}/${a}` };
    }
    if (isColToken(a) && /^\d{1,5}$/.test(b)) {
      return { kind: "path", path: `/${normalizeCol(a)}/${b}` };
    }
  }

  // bare number → Gen2 default
  if (/^\d{1,5}$/.test(sub)) {
    return { kind: "path", path: `/gen2/${sub}` };
  }

  // SNS subdomain under monke: foo.monke.sol
  return {
    kind: "sns",
    domain: `${sub}.monke.sol`,
  };
}

function isColToken(s: string): boolean {
  return /^(gen2|gen3|barrel|g2|g3|b|smb)$/i.test(s);
}

function normalizeCol(s: string): "gen2" | "gen3" | "barrel" {
  const x = s.toLowerCase();
  if (x === "gen3" || x === "g3") return "gen3";
  if (x === "barrel" || x === "b") return "barrel";
  return "gen2";
}

/** Query string looks like a monke.sol SNS name */
export function looksLikeMonkeSol(q: string): boolean {
  const s = q.trim().toLowerCase().replace(/^@/, "");
  return s === "monke.sol" || s.endsWith(".monke.sol") || s === "monke";
}
