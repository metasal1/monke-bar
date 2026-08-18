import assert from "node:assert/strict";

// Inline mirror of route rules for a quick node test (source of truth: src/lib/monke-sol.ts)
function normalizeCol(s) {
  const x = s.toLowerCase();
  if (x === "gen3" || x === "g3") return "gen3";
  if (x === "barrel" || x === "b") return "barrel";
  return "gen2";
}
function isColToken(s) {
  return /^(gen2|gen3|barrel|g2|g3|b|smb)$/i.test(s);
}
function route(host) {
  const h = host.toLowerCase().split(":")[0];
  if (h === "monke.sol" || h === "www.monke.sol") return { kind: "home" };
  if (!h.endsWith(".monke.sol")) return { kind: "home" };
  const sub = h.slice(0, -".monke.sol".length);
  if (!sub) return { kind: "home" };
  const mintM = sub.match(/^mint-([1-9A-HJ-NP-Za-km-z]{32,44})$/);
  if (mintM) return { kind: "path", path: `/mint/${mintM[1]}` };
  const dashed = sub.match(/^(gen2|gen3|barrel|g2|g3|b)[_-]?(\d{1,5})$/i);
  if (dashed) return { kind: "path", path: `/${normalizeCol(dashed[1])}/${dashed[2]}` };
  const parts = sub.split(".").filter(Boolean);
  if (parts.length === 2) {
    const [a, b] = parts;
    if (/^\d{1,5}$/.test(a) && isColToken(b))
      return { kind: "path", path: `/${normalizeCol(b)}/${a}` };
    if (isColToken(a) && /^\d{1,5}$/.test(b))
      return { kind: "path", path: `/${normalizeCol(a)}/${b}` };
  }
  if (/^\d{1,5}$/.test(sub)) return { kind: "path", path: `/gen2/${sub}` };
  return { kind: "sns", domain: `${sub}.monke.sol` };
}

assert.deepEqual(route("monke.sol"), { kind: "home" });
assert.deepEqual(route("1355.monke.sol"), { kind: "path", path: "/gen2/1355" });
assert.deepEqual(route("gen3-12192.monke.sol"), {
  kind: "path",
  path: "/gen3/12192",
});
assert.deepEqual(route("12192.gen3.monke.sol"), {
  kind: "path",
  path: "/gen3/12192",
});
assert.deepEqual(route("toly.monke.sol"), {
  kind: "sns",
  domain: "toly.monke.sol",
});
console.log("OK monke-sol routes");
