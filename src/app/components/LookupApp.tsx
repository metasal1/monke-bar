"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { monkePath } from "@/lib/deeplink";
import { HOUSE_MONKE } from "@/lib/house-monke";
import {
  meCollectionUrl,
  meItemUrl,
  tensorCollectionUrl,
  tensorItemUrl,
} from "@/lib/markets";
import { track } from "@/lib/analytics";

const ShareButtons = dynamic(() => import("@/app/components/ShareButtons"), {
  ssr: false,
});
const DonatePanel = dynamic(() => import("@/app/components/DonatePanel"), {
  ssr: false,
});

type CollectionId = "smb_gen2" | "smb_gen3" | "smb_barrel" | "all";

type Attr = { trait_type: string; value: string | number };

interface Monke {
  mint: string;
  name: string;
  number: number | null;
  image: string;
  owner: string | null;
  collectionMint: string | null;
  attributes: Attr[];
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
  rarity: {
    rank: number | null;
    image?: string;
    link?: string | null;
    attributes?: { name: string; value: string; rarity?: string }[];
  } | null;
  floor?: Floor | null;
  collectionId?: CollectionId | null;
  resolvedWallet?: string;
  resolvedDomain?: string;
  error?: string;
}

const TABS: { id: CollectionId; label: string }[] = [
  { id: "smb_gen3", label: "Gen3" },
  { id: "smb_gen2", label: "Gen2" },
  { id: "smb_barrel", label: "Barrel" },
  { id: "all", label: "All" },
];

const GEN2_MINT = "SMBtHCCC6RYRutFEPb4gZqeBLUZbMNhRKaMKZZLHi7W";
const GEN3_MINT = "8Rt3Ayqth4DAiPnW9MDFi63TiQJHmohfTWLMQFHi4KZH";
const BARREL_MINT = "Ce92PLCQrz2gLNAE5DFovvmpoeLBLtpTzqqeD4Px76hp";

/** Instant paint for Metasal monke before network returns */
const HOUSE_SEED: Monke = {
  mint: HOUSE_MONKE.mint,
  name: HOUSE_MONKE.name,
  number: HOUSE_MONKE.number,
  image: "",
  owner: null,
  collectionMint: GEN3_MINT,
  attributes: [],
};

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
  const col =
    detectCol(m) || (fallbackCol === "all" ? "smb_gen3" : fallbackCol);
  return monkePath(col, m.number, m.mint) || `/mint/${m.mint}`;
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
  initialCollection = "smb_gen3",
  initialQuery = "",
  deeplinkPath,
}: LookupAppProps = {}) {
  const isDefaultHome =
    !deeplinkPath &&
    (!initialQuery ||
      (initialQuery === String(HOUSE_MONKE.number) &&
        initialCollection === "smb_gen3"));

  const defaultQ =
    initialQuery.trim() ||
    (deeplinkPath ? "" : String(HOUSE_MONKE.number));
  const defaultCol: CollectionId =
    initialCollection ||
    (deeplinkPath ? "smb_gen3" : "smb_gen3");

  const [q, setQ] = useState(defaultQ);
  const [collection, setCollection] = useState<CollectionId>(defaultCol);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<LookupResponse | null>(() =>
    isDefaultHome
      ? {
          kind: "number",
          query: String(HOUSE_MONKE.number),
          monke: HOUSE_SEED,
          monkes: [HOUSE_SEED],
          rarity: null,
        }
      : null
  );
  const [err, setErr] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [floor, setFloor] = useState<Floor | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, LookupResponse>>(new Map());

  const runLookup = useCallback(
    async (query: string, col: CollectionId, opts?: { soft?: boolean }) => {
      const trimmed = query.trim();
      if (!trimmed) return;

      const cacheKey = `${col}:${trimmed.toLowerCase()}`;
      const cached = cacheRef.current.get(cacheKey);
      if (cached) {
        setData(cached);
        setErr(null);
        setLoading(false);
      }

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      if (!cached && !opts?.soft) setLoading(true);
      setErr(null);

      try {
        const res = await fetch(
          `/api/lookup?q=${encodeURIComponent(trimmed)}&collection=${col}`,
          { signal: ac.signal }
        );
        const json = (await res.json()) as LookupResponse;
        if (!res.ok) throw new Error(json.error || "Lookup failed");
        cacheRef.current.set(cacheKey, json);
        if (cacheRef.current.size > 40) {
          const first = cacheRef.current.keys().next().value;
          if (first) cacheRef.current.delete(first);
        }
        setData(json);
        track("lookup", {
          kind: json.kind,
          collection: col,
          q: trimmed.slice(0, 40),
        });

        const m = json.monke || json.monkes?.[0];
        if (m && typeof window !== "undefined" && !deeplinkPath) {
          const path = monkeHref(m, col);
          if (
            path.startsWith("/gen2/") ||
            path.startsWith("/gen3/") ||
            path.startsWith("/barrel/") ||
            path.startsWith("/mint/")
          ) {
            if (window.location.pathname !== path) {
              window.history.replaceState(null, "", path);
            }
          }
        }
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        if (!cached) {
          setData(null);
          setErr(e instanceof Error ? e.message : "Lookup failed");
        }
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    },
    [deeplinkPath]
  );

  // Initial lookup (default house monke or deeplink)
  useEffect(() => {
    const qq = defaultQ.trim();
    if (!qq) return;
    void runLookup(qq, defaultCol, { soft: isDefaultHome });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Floors only when "More" opens
  useEffect(() => {
    if (!moreOpen || floor) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/floor?collection=${collection}`);
        if (!res.ok || cancelled) return;
        setFloor((await res.json()) as Floor);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [moreOpen, collection, floor]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void runLookup(q, collection);
  }

  function onTab(id: CollectionId) {
    setCollection(id);
    setFloor(null);
    if (q.trim()) void runLookup(q, id);
  }

  function loadHouse() {
    setQ(String(HOUSE_MONKE.number));
    setCollection("smb_gen3");
    void runLookup(String(HOUSE_MONKE.number), "smb_gen3");
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", HOUSE_MONKE.href);
    }
  }

  const primary = data?.monke || data?.monkes?.[0] || null;
  const gallery =
    data?.monkes && data.monkes.length > 1
      ? data.monkes
      : data?.monkes && !data.monke
        ? data.monkes
        : [];
  const primaryHref = primary ? monkeHref(primary, collection) : null;
  const rarity = data?.rarity;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-4 pb-12 pt-8 sm:px-6">
      <header className="mb-5 text-center">
        <h1 className="text-[20px] leading-tight text-banana sm:text-[22px]">
          monke.bar
        </h1>
        <p className="mt-1 text-[10px] text-muted">Monke lookup</p>
      </header>

      <div className="mb-3 flex flex-wrap justify-center gap-1.5">
        {TABS.map((t) => {
          const active = collection === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onTab(t.id)}
              className={`rounded-none px-3 py-2 text-[10px] font-semibold ${
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

      <form onSubmit={onSubmit} className="mb-5 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="# · mint · wallet · name.sol"
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          enterKeyHint="search"
          inputMode="search"
          className="min-w-0 flex-1 rounded-none border-2 border-border bg-wood px-4 py-3.5 text-[16px] text-foreground outline-none placeholder:text-muted focus:border-banana"
        />
        <button
          type="submit"
          disabled={loading || !q.trim()}
          className="rounded-none border-2 border-black bg-banana px-4 py-3.5 text-[11px] font-semibold text-ink pixel-btn disabled:opacity-50"
        >
          {loading ? "…" : "Go"}
        </button>
      </form>

      {err && (
        <div className="mb-4 border-2 border-red-500/40 bg-red-500/10 px-3 py-2 text-[11px] text-red-200">
          {err}
        </div>
      )}

      {data?.resolvedDomain && (
        <p className="mb-3 text-[10px] text-muted">
          {data.resolvedDomain}
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
        <article className="border-2 border-banana bg-card">
          <div className="grid gap-0 sm:grid-cols-[180px_1fr]">
            <div className="aspect-square bg-ink">
              {primary.image || rarity?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={primary.image || rarity?.image || ""}
                  alt={primary.name}
                  className="h-full w-full object-cover"
                  style={{ imageRendering: "pixelated" }}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-[10px] text-muted">
                  {loading ? "…" : "no img"}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 p-4">
              <h2 className="text-[14px] text-banana sm:text-[15px]">
                {primaryHref ? (
                  <Link href={primaryHref} className="hover:underline">
                    {primary.name}
                  </Link>
                ) : (
                  primary.name
                )}
              </h2>
              {rarity?.rank != null && (
                <p className="text-[10px] text-muted">Rank #{rarity.rank}</p>
              )}
              <p className="text-[10px] text-muted">
                Mint{" "}
                <a
                  href={`https://solscan.io/token/${primary.mint}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-banana hover:underline"
                  title={primary.mint}
                >
                  {shortAddr(primary.mint, 6)}
                </a>
              </p>
              {primary.owner && (
                <p className="text-[10px] text-muted">
                  Owner{" "}
                  <a
                    href={`https://solscan.io/account/${primary.owner}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-banana hover:underline"
                  >
                    {shortAddr(primary.owner, 6)}
                  </a>
                </p>
              )}
              <p className="mt-1 flex flex-wrap gap-3 text-[10px]">
                <a
                  href={meItemUrl(primary.mint)}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="text-banana hover:underline"
                >
                  ME
                </a>
                <a
                  href={tensorItemUrl(primary.mint)}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="text-banana hover:underline"
                >
                  Tensor
                </a>
                {primaryHref && (
                  <Link
                    href={primaryHref}
                    className="text-muted hover:text-banana"
                  >
                    link
                  </Link>
                )}
              </p>
            </div>
          </div>
        </article>
      )}

      {gallery.length > 1 && (
        <section className="mt-5">
          <h3 className="mb-2 text-[11px] text-banana">
            {data?.kind === "sns" ? "SNS" : "Wallet"} ({gallery.length})
          </h3>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {gallery.map((m) => (
              <li key={m.mint}>
                <Link
                  href={monkeHref(m, collection)}
                  className="block border-2 border-border bg-card hover:border-banana"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.image}
                    alt={m.name}
                    className="aspect-square w-full object-cover"
                    style={{ imageRendering: "pixelated" }}
                    loading="lazy"
                  />
                  <div className="truncate px-1 py-1 text-[8px] text-muted">
                    {m.name}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Hidden extras — everything else */}
      <div className="mt-6 border-2 border-border bg-wood">
        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          className="flex w-full items-center justify-between px-3 py-3 text-left text-[10px] text-banana"
        >
          <span>More</span>
          <span className="text-muted">{moreOpen ? "−" : "+"}</span>
        </button>
        {moreOpen && (
          <div className="space-y-5 border-t-2 border-border px-3 py-4">
            <div>
              <h3 className="mb-2 text-[10px] text-muted">Floor</h3>
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                <div>
                  <div className="text-muted">Floor</div>
                  <div className="text-banana">{fmtSol(floor?.floorSol)}</div>
                </div>
                <div>
                  <div className="text-muted">Listed</div>
                  <div className="text-banana">
                    {floor?.listedCount != null ? floor.listedCount : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-muted">24h</div>
                  <div className="text-banana">
                    {fmtSol(floor?.volume24hSol)}
                  </div>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-[10px]">
                {meCollectionUrl(collection) && (
                  <a
                    href={meCollectionUrl(collection)!}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    className="text-banana hover:underline"
                  >
                    ME collection
                  </a>
                )}
                {tensorCollectionUrl(collection) && (
                  <a
                    href={tensorCollectionUrl(collection)!}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    className="text-banana hover:underline"
                  >
                    Tensor
                  </a>
                )}
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-[10px] text-muted">Share</h3>
              <ShareButtons
                title={primary?.name}
                path={primaryHref || undefined}
              />
            </div>

            <div>
              <h3 className="mb-2 text-[10px] text-muted">Donate · $55/yr</h3>
              <DonatePanel />
            </div>

            <p className="text-[9px] text-muted">
              <Link href="/support" className="text-banana hover:underline">
                Full support page
              </Link>
            </p>
          </div>
        )}
      </div>

      <footer className="mt-auto pt-8 text-center text-[9px] leading-relaxed text-muted">
        <p>
          Made with 💚{" "}
          <a
            href="https://metasal.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-banana hover:underline"
          >
            metasal.xyz
          </a>
        </p>
        <p className="mt-2">
          Default monke{" "}
          <button
            type="button"
            onClick={loadHouse}
            className="text-banana underline-offset-2 hover:underline"
            title={HOUSE_MONKE.name}
          >
            {HOUSE_MONKE.name}
          </button>
        </p>
      </footer>
    </div>
  );
}
