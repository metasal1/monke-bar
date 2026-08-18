"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { monkePath } from "@/lib/deeplink";
import { HOUSE_MONKE } from "@/lib/house-monke";

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

const GEN2_MINT = "SMBtHCCC6RYRutFEPb4gZqeBLUZbMNhRKaMKZZLHi7W";
const GEN3_MINT = "8Rt3Ayqth4DAiPnW9MDFi63TiQJHmohfTWLMQFHi4KZH";
const BARREL_MINT = "Ce92PLCQrz2gLNAE5DFovvmpoeLBLtpTzqqeD4Px76hp";

function detectCol(m: Monke): CollectionId | null {
  if (m.collectionMint === GEN2_MINT) return "smb_gen2";
  if (m.collectionMint === GEN3_MINT) return "smb_gen3";
  if (m.collectionMint === BARREL_MINT) return "smb_barrel";
  if (/Barrel\s*#/i.test(m.name)) return "smb_barrel";
  if (/Gen3\s*#/i.test(m.name)) return "smb_gen3";
  if (/^SMB\s*#/i.test(m.name)) return "smb_gen2";
  return null;
}

function monkeHref(m: Monke, fallbackCol: CollectionId): string {
  const col = detectCol(m) || (fallbackCol === "all" ? "smb_gen2" : fallbackCol);
  return (
    monkePath(col, m.number, m.mint) ||
    `/mint/${m.mint}`
  );
}

function shortAddr(a: string, n = 4) {
  if (!a || a.length < 10) return a;
  return `${a.slice(0, n)}…${a.slice(-n)}`;
}

function fmtSol(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} SOL`;
}

export interface LookupAppProps {
  initialCollection?: CollectionId;
  initialQuery?: string;
  deeplinkPath?: string;
}

export default function LookupApp({
  initialCollection = "smb_gen2",
  initialQuery = "",
  deeplinkPath,
}: LookupAppProps = {}) {
  const [q, setQ] = useState(initialQuery);
  const [collection, setCollection] =
    useState<CollectionId>(initialCollection);
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

  const pushPath = useCallback(
    (json: LookupResponse, query: string, col: CollectionId) => {
      const m = json.monke;
      const resolvedCol =
        (json.collectionId as CollectionId | null | undefined) ||
        (m ? detectCol(m) : null) ||
        col;
      let path: string | null = null;
      if (m) {
        path = monkePath(
          resolvedCol === "all" ? detectCol(m) : resolvedCol,
          m.number,
          m.mint
        );
      }
      if (!path && json.kind === "sns" && json.resolvedDomain) {
        path = `/?q=${encodeURIComponent(json.resolvedDomain)}&collection=${col}`;
      } else if (!path && json.kind === "wallet") {
        path = `/?q=${encodeURIComponent(query)}&collection=${col}`;
      } else if (!path) {
        path = monkePath(col === "all" ? "smb_gen2" : col, Number(query) || null) ||
          `/?q=${encodeURIComponent(query)}&collection=${col}`;
      }
      if (path && path !== window.location.pathname + window.location.search) {
        window.history.replaceState({}, "", path);
      }
    },
    []
  );

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
          if (json.collectionId && json.collectionId !== "all") {
            setCollection(json.collectionId as CollectionId);
          }
          pushPath(json, trimmed, col);
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Request failed");
      } finally {
        setLoading(false);
      }
    },
    [collection, pushPath]
  );

  // initial / deeplink
  useEffect(() => {
    if (initialQuery) {
      setQ(initialQuery);
      setCollection(initialCollection);
      void run(initialQuery, initialCollection);
      return;
    }
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

  const primaryHref = primary
    ? monkeHref(primary, (data?.collectionId as CollectionId) || collection)
    : null;

  const examples =
    collection === "smb_gen3"
      ? [
          { label: "#20", href: "/gen3/20", q: "20" },
          { label: "#7113", href: "/gen3/7113", q: "7113" },
          { label: "#12192", href: "/gen3/12192", q: "12192" },
        ]
      : collection === "smb_barrel"
        ? [
            { label: "#430", href: "/barrel/430", q: "430" },
            { label: "#12870", href: "/barrel/12870", q: "12870" },
          ]
        : [
            { label: "#1355", href: "/gen2/1355", q: "1355" },
            { label: "#1", href: "/gen2/1", q: "1" },
            { label: "#420", href: "/gen2/420", q: "420" },
          ];

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 pb-16 pt-8 sm:px-6">
      <header className="mb-8 text-center">
        <div className="bar-sign mx-auto mb-4 inline-block px-5 py-3">
          <Link
            href={HOUSE_MONKE.href}
            className="font-pixel text-[10px] text-banana hover:underline sm:text-xs"
            title={HOUSE_MONKE.name}
          >
            ★ THE MONKE BAR ★
          </Link>
        </div>
        <Link
          href={HOUSE_MONKE.href}
          className="mb-3 inline-flex items-center gap-2 rounded-none border-2 border-banana bg-wood px-3 py-1 font-mono text-xs text-banana pixel-btn"
          title={`House monke ${HOUSE_MONKE.name}`}
        >
          monke.bar
          <span className="text-muted">·</span>
          <span className="text-neon">{HOUSE_MONKE.name}</span>
        </Link>
        <h1 className="font-pixel text-2xl tracking-tight text-banana sm:text-4xl">
          SOLANA MONKE
        </h1>
        <p className="mt-2 font-mono text-xs text-muted sm:text-sm">
          Pixel PFP bar · Gen2 · Gen3 · Barrel · # · mint · wallet · .sol
        </p>
        <div className="bar-rail mx-auto mt-4 w-full max-w-md" />

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
                  ? "bg-banana text-ink pixel-btn"
                  : "border-2 border-border bg-wood text-muted hover:border-banana hover:text-banana pixel-btn"
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
          className="min-w-0 flex-1 rounded-none border-2 border-border bg-wood px-4 py-3 font-mono text-sm text-foreground outline-none ring-banana/40 placeholder:text-muted focus:border-banana focus:ring-2"
        />
        <button
          type="submit"
          disabled={loading || !q.trim()}
          className="rounded-none border-2 border-black bg-banana px-5 py-3 font-pixel text-[10px] font-semibold text-ink pixel-btn hover:brightness-110 disabled:opacity-50 sm:text-xs"
        >
          {loading ? "…" : "Lookup"}
        </button>
      </form>

      <div className="mb-6 flex flex-wrap gap-2">
        {examples.map((ex) => (
          <Link
            key={ex.href}
            href={ex.href}
            className="rounded-lg border border-border bg-card px-3 py-1.5 font-mono text-xs text-muted hover:border-banana/40 hover:text-banana"
          >
            {ex.label}
          </Link>
        ))}
        <Link
          href="/?q=toly.sol&collection=all"
          className="rounded-lg border border-border bg-card px-3 py-1.5 font-mono text-xs text-muted hover:border-banana/40 hover:text-banana"
        >
          toly.sol
        </Link>
      </div>

      {err && (
        <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
      )}

      {data?.resolvedDomain && (
        <p className="mb-3 font-mono text-xs text-muted">
          SNS <span className="text-banana">{data.resolvedDomain}</span>
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
        <article className="pixel-frame overflow-hidden rounded-none border-2 border-banana bg-card">
          <div className="grid gap-0 sm:grid-cols-[240px_1fr]">
            <div className="relative aspect-square bg-ink">
              {primaryHref ? (
                <Link href={primaryHref} className="block h-full w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={primary.image || rarity?.image || ""}
                    alt={primary.name}
                    className="pixel-img h-full w-full object-cover"
                    style={{ imageRendering: "pixelated" }}
                  />
                </Link>
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={primary.image || rarity?.image || ""}
                    alt={primary.name}
                    className="pixel-img h-full w-full object-cover"
                    style={{ imageRendering: "pixelated" }}
                  />
                </>
              )}
              {primary.mint === HOUSE_MONKE.mint && (
                <Link
                  href={HOUSE_MONKE.href}
                  className="absolute bottom-2 left-2 border-2 border-black bg-banana px-2 py-1 font-pixel text-[8px] text-ink"
                >
                  HOUSE
                </Link>
              )}
            </div>
            <div className="flex flex-col gap-3 p-5">
              <div>
                <h2 className="font-pixel text-xl text-banana sm:text-2xl">
                  {primaryHref ? (
                    <Link href={primaryHref} className="hover:underline">
                      {primary.name}
                    </Link>
                  ) : (
                    primary.name
                  )}
                </h2>
                {primaryHref && (
                  <p className="mt-1 font-mono text-[11px] text-muted">
                    deeplink{" "}
                    <Link
                      href={primaryHref}
                      className="text-banana hover:underline"
                    >
                      monke.bar{primaryHref}
                    </Link>
                  </p>
                )}
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
            {gallery.map((m) => {
              const href = monkeHref(m, collection);
              return (
                <li key={m.mint}>
                  <Link
                    href={href}
                    className="block w-full overflow-hidden rounded-xl border border-border bg-card text-left transition hover:border-banana/50"
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
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <footer className="mt-auto pt-12 text-center font-mono text-[11px] text-muted">
        <p>
          Unofficial · Helius + HowRare + Magic Eden + SNS ·{" "}
          <a
            href="https://solanamonkey.business/"
            target="_blank"
            rel="noreferrer"
            className="text-banana/80 hover:underline"
          >
            solanamonkey.business
          </a>
        </p>
        {data?.indexPartial && data.indexCount != null && (
          <span className="mt-1 block text-[10px] opacity-70">
            # index partial ({data.indexCount.toLocaleString()} known)
          </span>
        )}
        <div className="bar-rail mx-auto mb-4 mt-6 w-full max-w-sm" />
        <p className="mt-3">
          Made with 💚{" "}
          <a
            href="https://metasal.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-banana hover:underline"
          >
            metasal.xyz
          </a>
          {" · "}
          house monke{" "}
          <Link
            href={HOUSE_MONKE.href}
            className="text-banana hover:underline"
            title={`${HOUSE_MONKE.name} → ${HOUSE_MONKE.href}`}
          >
            {HOUSE_MONKE.name}
          </Link>
          {" · "}
          <a
            href={HOUSE_MONKE.solscan}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted hover:text-banana hover:underline"
          >
            solscan
          </a>
        </p>
        <p className="mt-2">
          <Link
            href={HOUSE_MONKE.href}
            className="inline-block border-2 border-banana bg-wood px-3 py-2 font-pixel text-[9px] text-banana pixel-btn"
          >
            ★ OPEN HOUSE MONKE ★
          </Link>
        </p>
        {deeplinkPath ? (
          <span className="sr-only">path {deeplinkPath}</span>
        ) : null}
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
