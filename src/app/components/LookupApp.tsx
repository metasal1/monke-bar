"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { monkePath } from "@/lib/deeplink";
import { HOUSE_MONKE } from "@/lib/house-monke";
import {
  meCollectionUrl,
  meItemUrl,
  tensorCollectionUrl,
  tensorItemUrl,
} from "@/lib/markets";
import { track } from "@/lib/analytics";
import DonatePanel from "@/app/components/DonatePanel";

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
          track("lookup_error", { q: trimmed, collection: col });
        } else {
          setData(json);
          track("lookup", {
            kind: json.kind || "unknown",
            collection: String(json.collectionId || col),
          });
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
      <header className="mb-7 text-center">
        <div className="bar-sign mx-auto mb-5 inline-block px-4 py-2.5 sm:px-6 sm:py-3">
          <Link
            href={HOUSE_MONKE.href}
            className="text-[10px] leading-relaxed text-banana hover:underline sm:text-[12px]"
            title={HOUSE_MONKE.name}
          >
            ★ THE MONKE BAR ★
          </Link>
        </div>
        <h1 className="text-[18px] leading-tight tracking-tight text-banana sm:text-[26px]">
          SOLANA MONKE
        </h1>
        <p className="mt-3 text-[10px] leading-relaxed text-muted sm:text-[11px]">
          Gen2 · Gen3 · Barrel
        </p>
        <p className="mt-1 text-[10px] leading-relaxed text-muted/80 sm:text-[11px]">
          # · mint · wallet · .sol · *.monke.sol
        </p>
        <Link
          href={HOUSE_MONKE.href}
          className="mt-4 inline-flex items-center gap-2 rounded-none border-2 border-banana/70 bg-wood px-3 py-2 text-[10px] text-banana pixel-btn hover:border-banana"
          title={HOUSE_MONKE.name}
        >
          monke.bar
          <span className="text-muted">·</span>
          <span className="text-neon">{HOUSE_MONKE.name}</span>
        </Link>
        <div className="bar-rail mx-auto mt-5 w-full max-w-md" />

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
              className={`rounded-none px-3 py-2.5 text-[10px] font-semibold transition sm:px-4 sm:text-[11px] ${
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

      {(meCollectionUrl(collection) || tensorCollectionUrl(collection)) && (
        <div className="mb-4 flex flex-wrap justify-center gap-2 text-[10px]">
          {meCollectionUrl(collection) && (
            <a
              href={meCollectionUrl(collection)!}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="border-2 border-border bg-wood px-3 py-2 text-banana pixel-btn hover:border-banana"
              onClick={() =>
                track("outbound_market", {
                  venue: "magic_eden_collection",
                  collection,
                })
              }
            >
              ME floor
            </a>
          )}
          {tensorCollectionUrl(collection) && (
            <a
              href={tensorCollectionUrl(collection)!}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="border-2 border-border bg-wood px-3 py-2 text-banana pixel-btn hover:border-banana"
              onClick={() =>
                track("outbound_market", {
                  venue: "tensor_collection",
                  collection,
                })
              }
            >
              Tensor trade
            </a>
          )}
        </div>
      )}

      <form onSubmit={onSubmit} className="search-bar mb-4 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="# · mint · wallet · name.sol · *.monke.sol"
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          enterKeyHint="search"
          inputMode="search"
          className="min-w-0 flex-1 rounded-none border-2 border-border bg-wood px-4 py-3.5 text-[16px] leading-normal text-foreground outline-none ring-banana/40 placeholder:text-muted focus:border-banana focus:ring-2"
        />
        <button
          type="submit"
          disabled={loading || !q.trim()}
          className="rounded-none border-2 border-black bg-banana px-5 py-3.5 text-[11px] font-semibold text-ink pixel-btn hover:brightness-110 disabled:opacity-50"
        >
          {loading ? "…" : "Lookup"}
        </button>
      </form>

      <div className="mb-6 flex flex-wrap gap-2">
        {examples.map((ex) => (
          <Link
            key={ex.href}
            href={ex.href}
            className="rounded-none border-2 border-border bg-card px-3 py-2 text-[10px] text-muted hover:border-banana/40 hover:text-banana"
          >
            {ex.label}
          </Link>
        ))}
        <Link
          href="/?q=toly.sol&collection=all"
          className="rounded-none border-2 border-border bg-card px-3 py-2 text-[10px] text-muted hover:border-banana/40 hover:text-banana"
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
        <p className="mb-3 text-pixel-xs text-muted">
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
            </div>
            <div className="flex flex-col gap-3 p-5">
              <div>
                <h2 className="text-[14px] leading-snug text-banana sm:text-[16px]">
                  {primaryHref ? (
                    <Link href={primaryHref} className="hover:underline">
                      {primary.name}
                    </Link>
                  ) : (
                    primary.name
                  )}
                </h2>
                {primaryHref && (
                  <p className="mt-1 text-pixel-xs text-muted">
                                        <Link
                      href={primaryHref}
                      className="text-banana hover:underline"
                    >
                      monke.bar{primaryHref}
                    </Link>
                  </p>
                )}
              </div>

              <dl className="grid gap-2 text-pixel-xs sm:text-sm">
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
                        href={meItemUrl(primary.mint)}
                        target="_blank"
                        rel="noopener noreferrer sponsored"
                        className="text-banana hover:underline"
                        onClick={() =>
                          track("outbound_market", {
                            venue: "magic_eden",
                            mint: primary.mint,
                          })
                        }
                      >
                        Magic Eden
                      </a>
                      <a
                        href={tensorItemUrl(primary.mint)}
                        target="_blank"
                        rel="noopener noreferrer sponsored"
                        className="text-banana hover:underline"
                        onClick={() =>
                          track("outbound_market", {
                            venue: "tensor",
                            mint: primary.mint,
                          })
                        }
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
          <h3 className="mb-3 text-[12px] text-banana sm:text-[14px]">
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
                    <div className="px-2 py-2 text-[9px] leading-snug text-foreground">
                      {m.name}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <footer className="mt-auto pt-12 text-center text-[10px] leading-relaxed text-muted">
        <p>
          Unofficial · Helius · Magic Eden · Tensor · SNS ·{" "}
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
          <span className="mt-1 block text-[9px] opacity-70">
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
          <Link
            href={HOUSE_MONKE.href}
            className="text-banana hover:underline"
            title={HOUSE_MONKE.name}
          >
            {HOUSE_MONKE.name}
          </Link>
        </p>
        <DonatePanel />
        {deeplinkPath ? (
          <span className="sr-only">path {deeplinkPath}</span>
        ) : null}
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-none border-2 border-border bg-card px-2 py-2 sm:px-3">
      <div className="text-[8px] uppercase tracking-wider text-muted sm:text-[9px]">
        {label}
      </div>
      <div className="mt-1 text-[10px] leading-tight text-banana sm:text-[12px]">
        {value}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex gap-3 border-b border-border/60 pb-2 last:border-0">
      <dt className="w-14 shrink-0 text-[10px] text-muted sm:w-16">{k}</dt>
      <dd className="min-w-0 break-all text-[10px] sm:text-[11px]">{v}</dd>
    </div>
  );
}
