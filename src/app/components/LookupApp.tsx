"use client";

import { useCallback, useEffect, useState } from "react";

type CollectionId = "smb_gen2" | "smb_gen3" | "smb_barrel" | "all";

type Attr = { trait_type: string; value: string | number; rarity?: string };

interface Monke {
  mint: string;
  name: string;
  number: number | null;
  image: string;
  owner: string | null;
  collectionMint: string | null;
  attributes: Attr[];
  frozen: boolean;
}

interface Rarity {
  id: number;
  mint: string;
  name: string;
  image: string;
  rank: number | null;
  link: string | null;
  attributes: { name: string; value: string; rarity?: string }[];
}

interface Floor {
  floorSol: number | null;
  listedCount: number | null;
  volume24hSol: number | null;
}

interface LookupResponse {
  kind: string;
  query: string;
  monke: Monke | null;
  monkes: Monke[];
  rarity: Rarity | null;
  floor: Floor | null;
  collectionId?: CollectionId | null;
  resolvedWallet?: string;
  resolvedDomain?: string;
  indexPartial?: boolean;
  indexCount?: number;
  error?: string;
}

const TABS: { id: CollectionId; label: string }[] = [
  { id: "smb_gen2", label: "Gen2" },
  { id: "smb_gen3", label: "Gen3" },
  { id: "smb_barrel", label: "Barrel" },
  { id: "all", label: "All" },
];

function shortAddr(a: string, n = 4) {
  if (!a || a.length < 10) return a;
  return `${a.slice(0, n)}…${a.slice(-n)}`;
}

function fmtSol(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} SOL`;
}

export default function LookupApp() {
  const [q, setQ] = useState("");
  const [collection, setCollection] = useState<CollectionId>("smb_gen2");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<LookupResponse | null>(null);
  const [floor, setFloor] = useState<Floor | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const loadFloor = useCallback((c: CollectionId) => {
    const col = c === "all" ? "smb_gen2" : c;
    fetch(`/api/floor?collection=${col}`)
      .then((r) => r.json())
      .then((j) => setFloor(j.floor || null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadFloor(collection);
  }, [collection, loadFloor]);

  const run = useCallback(
    async (query: string, col: CollectionId = collection) => {
      const trimmed = query.trim();
      if (!trimmed) return;
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(
          `/api/lookup?q=${encodeURIComponent(trimmed)}&collection=${col}`
        );
        const json = (await res.json()) as LookupResponse & { error?: string };
        if (!res.ok && json.error) {
          setErr(json.error);
          setData(null);
        } else {
          setData(json);
          if (json.floor) setFloor(json.floor);
          if (json.error) setErr(json.error);
          const url = new URL(window.location.href);
          url.searchParams.set("q", trimmed);
          url.searchParams.set("collection", col);
          window.history.replaceState({}, "", url.toString());
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Request failed");
      } finally {
        setLoading(false);
      }
    },
    [collection]
  );

  // deep link
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const initial = sp.get("q");
    const c = sp.get("collection") as CollectionId | null;
    if (c && TABS.some((t) => t.id === c)) setCollection(c);
    if (initial) {
      setQ(initial);
      void run(initial, c && TABS.some((t) => t.id === c) ? c : "smb_gen2");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void run(q, collection);
  };

  const onTab = (id: CollectionId) => {
    setCollection(id);
    setData(null);
    setErr(null);
    if (q.trim()) void run(q, id);
  };

  const primary = data?.monke;
  const rarity = data?.rarity;
  const gallery =
    data?.kind === "wallet" || data?.kind === "sns" ? data.monkes : [];

  const examples =
    collection === "smb_gen3"
      ? ["20", "7113", "4502"]
      : collection === "smb_barrel"
        ? ["430", "12870"]
        : ["1355", "1", "420"];

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 pb-16 pt-10 sm:px-6">
      <header className="mb-8 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-banana/30 bg-card px-3 py-1 font-mono text-xs text-banana">
          monke.bar
          <span className="text-muted">·</span>
          SMB lookup
        </div>
        <h1 className="font-pixel text-3xl tracking-tight text-banana sm:text-4xl">
          SOLANA MONKE
        </h1>
        <p className="mt-2 text-sm text-muted">
          Gen2 · Gen3 · Barrel — search by #, mint, wallet, or SNS (.sol)
        </p>

        <div className="mt-5 grid grid-cols-3 gap-2 text-left sm:gap-3">
          <Stat label="Floor" value={fmtSol(floor?.floorSol)} />
          <Stat
            label="Listed"
            value={
              floor?.listedCount != null ? String(floor.listedCount) : "—"
            }
          />
          <Stat label="24h Vol" value={fmtSol(floor?.volume24hSol)} />
        </div>
      </header>

      {/* Collection toggle */}
      <div className="mb-4 flex flex-wrap justify-center gap-2">
        {TABS.map((t) => {
          const active = collection === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onTab(t.id)}
              className={`rounded-full px-4 py-2 font-mono text-xs font-semibold transition sm:text-sm ${
                active
                  ? "bg-banana text-ink"
                  : "border border-border bg-card text-muted hover:border-banana/40 hover:text-banana"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <form onSubmit={onSubmit} className="mb-4 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="# · mint · wallet · name.sol"
          spellCheck={false}
          autoComplete="off"
          className="min-w-0 flex-1 rounded-xl border border-border bg-card px-4 py-3 font-mono text-sm text-foreground outline-none ring-banana/40 placeholder:text-muted focus:ring-2"
        />
        <button
          type="submit"
          disabled={loading || !q.trim()}
          className="rounded-xl bg-banana px-5 py-3 font-semibold text-ink transition hover:brightness-110 disabled:opacity-50"
        >
          {loading ? "…" : "Lookup"}
        </button>
      </form>

      <div className="mb-6 flex flex-wrap gap-2">
        {examples.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => {
              setQ(ex);
              void run(ex, collection);
            }}
            className="rounded-lg border border-border bg-card px-3 py-1.5 font-mono text-xs text-muted hover:border-banana/40 hover:text-banana"
          >
            #{ex}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setQ("toly.sol");
            void run("toly.sol", collection);
          }}
          className="rounded-lg border border-border bg-card px-3 py-1.5 font-mono text-xs text-muted hover:border-banana/40 hover:text-banana"
        >
          toly.sol
        </button>
      </div>

      {err && (
        <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
      )}

      {data?.resolvedDomain && (
        <p className="mb-3 font-mono text-xs text-muted">
          SNS{" "}
          <span className="text-banana">{data.resolvedDomain}</span>
          {data.resolvedWallet && (
            <>
              {" → "}
              <a
                href={`https://solscan.io/account/${data.resolvedWallet}`}
                target="_blank"
                rel="noreferrer"
                className="text-banana hover:underline"
              >
                {shortAddr(data.resolvedWallet, 6)}
              </a>
            </>
          )}
        </p>
      )}

      {primary && (
        <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-black/40">
          <div className="grid gap-0 sm:grid-cols-[240px_1fr]">
            <div className="relative aspect-square bg-ink">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={primary.image || rarity?.image || ""}
                alt={primary.name}
                className="h-full w-full object-cover"
                style={{ imageRendering: "pixelated" }}
              />
            </div>
            <div className="flex flex-col gap-3 p-5">
              <div>
                <h2 className="font-pixel text-xl text-banana sm:text-2xl">
                  {primary.name}
                </h2>
                {rarity?.rank != null && (
                  <p className="mt-1 font-mono text-sm text-muted">
                    HowRare rank{" "}
                    <span className="text-foreground">#{rarity.rank}</span>
                    {rarity.link && (
                      <>
                        {" · "}
                        <a
                          href={rarity.link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-banana underline-offset-2 hover:underline"
                        >
                          howrare
                        </a>
                      </>
                    )}
                  </p>
                )}
              </div>

              <dl className="grid gap-2 font-mono text-xs sm:text-sm">
                <Row
                  k="Mint"
                  v={
                    <a
                      href={`https://solscan.io/token/${primary.mint}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-banana hover:underline"
                      title={primary.mint}
                    >
                      {shortAddr(primary.mint, 6)}
                    </a>
                  }
                />
                {primary.owner && (
                  <Row
                    k="Owner"
                    v={
                      <a
                        href={`https://solscan.io/account/${primary.owner}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-banana hover:underline"
                        title={primary.owner}
                      >
                        {shortAddr(primary.owner, 6)}
                      </a>
                    }
                  />
                )}
                <Row
                  k="Market"
                  v={
                    <span className="flex flex-wrap gap-2">
                      <a
                        href={`https://magiceden.io/item-details/${primary.mint}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-banana hover:underline"
                      >
                        Magic Eden
                      </a>
                      <a
                        href={`https://www.tensor.trade/item/${primary.mint}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-banana hover:underline"
                      >
                        Tensor
                      </a>
                    </span>
                  }
                />
                {primary.frozen && <Row k="State" v="frozen" />}
              </dl>

              {(primary.attributes?.length > 0 ||
                (rarity?.attributes?.length || 0) > 0) && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                    Traits
                  </h3>
                  <ul className="grid grid-cols-2 gap-2">
                    {(primary.attributes.length
                      ? primary.attributes
                      : (rarity?.attributes || []).map((a) => ({
                          trait_type: a.name,
                          value: a.value,
                          rarity: a.rarity,
                        }))
                    ).map((a) => (
                      <li
                        key={`${a.trait_type}-${a.value}`}
                        className="rounded-lg border border-border bg-ink/60 px-2.5 py-2"
                      >
                        <div className="text-[10px] uppercase tracking-wide text-muted">
                          {a.trait_type}
                        </div>
                        <div className="truncate text-sm text-foreground">
                          {String(a.value)}
                        </div>
                        {"rarity" in a && a.rarity != null && (
                          <div className="font-mono text-[10px] text-banana/80">
                            {String(a.rarity)}%
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </article>
      )}

      {gallery.length > 0 && (
        <section className="mt-8">
          <h3 className="mb-3 font-pixel text-lg text-banana">
            {data?.kind === "sns" ? "SNS" : "Wallet"} monkes ({gallery.length})
          </h3>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {gallery.map((m) => (
              <li key={m.mint}>
                <button
                  type="button"
                  onClick={() => {
                    setQ(m.mint);
                    void run(m.mint, collection);
                  }}
                  className="w-full overflow-hidden rounded-xl border border-border bg-card text-left transition hover:border-banana/50"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.image}
                    alt={m.name}
                    className="aspect-square w-full object-cover"
                    style={{ imageRendering: "pixelated" }}
                  />
                  <div className="px-2 py-2 font-mono text-xs text-foreground">
                    {m.name}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-auto pt-12 text-center font-mono text-[11px] text-muted">
        Unofficial · Helius + HowRare + Magic Eden + SNS ·{" "}
        <a
          href="https://solanamonkey.business/"
          target="_blank"
          rel="noreferrer"
          className="text-banana/80 hover:underline"
        >
          solanamonkey.business
        </a>
        {data?.indexPartial && data.indexCount != null && (
          <span className="mt-1 block text-[10px] opacity-70">
            # index partial ({data.indexCount.toLocaleString()} known)
          </span>
        )}
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted">
        {label}
      </div>
      <div className="font-mono text-sm text-banana sm:text-base">{value}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex gap-3 border-b border-border/60 pb-2 last:border-0">
      <dt className="w-16 shrink-0 text-muted">{k}</dt>
      <dd className="min-w-0 break-all">{v}</dd>
    </div>
  );
}
