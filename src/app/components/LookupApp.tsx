"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { monkePath } from "@/lib/deeplink";
import { meItemUrl, tensorItemUrl } from "@/lib/markets";
import { track } from "@/lib/analytics";

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

interface LookupResponse {
  kind: string;
  query: string;
  monke: Monke | null;
  monkes: Monke[];
  rarity: { rank: number | null; image?: string } | null;
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
  return monkePath(col, m.number, m.mint) || `/mint/${m.mint}`;
}

function shortAddr(a: string, n = 4) {
  if (!a || a.length < 10) return a;
  return `${a.slice(0, n)}…${a.slice(-n)}`;
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
  const [err, setErr] = useState<string | null>(null);

  const runLookup = useCallback(
    async (query: string, col: CollectionId) => {
      const trimmed = query.trim();
      if (!trimmed) return;
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(
          `/api/lookup?q=${encodeURIComponent(trimmed)}&collection=${col}`
        );
        const json = (await res.json()) as LookupResponse;
        if (!res.ok) throw new Error(json.error || "Lookup failed");
        setData(json);
        track("lookup", {
          kind: json.kind,
          collection: col,
          q: trimmed.slice(0, 40),
        });

        const m = json.monke || json.monkes?.[0];
        if (m && typeof window !== "undefined") {
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
        setData(null);
        setErr(e instanceof Error ? e.message : "Lookup failed");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (initialQuery.trim()) {
      void runLookup(initialQuery, initialCollection);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (deeplinkPath) return;
    const sp = new URLSearchParams(window.location.search);
    const qq = sp.get("q");
    const cc = sp.get("collection") as CollectionId | null;
    if (qq) {
      setQ(qq);
      if (cc && TABS.some((t) => t.id === cc)) setCollection(cc);
      void runLookup(qq, cc && TABS.some((t) => t.id === cc) ? cc : collection);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void runLookup(q, collection);
  }

  function onTab(id: CollectionId) {
    setCollection(id);
    if (q.trim()) void runLookup(q, id);
  }

  const primary = data?.monke || data?.monkes?.[0] || null;
  const gallery =
    data?.monkes && data.monkes.length > 1
      ? data.monkes
      : data?.monkes && !data.monke
        ? data.monkes
        : [];
  const primaryHref = primary ? monkeHref(primary, collection) : null;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-4 pb-12 pt-10 sm:px-6">
      <header className="mb-6 text-center">
        <h1 className="text-[20px] leading-tight text-banana sm:text-[24px]">
          monke.bar
        </h1>
        <p className="mt-2 text-[10px] text-muted">
          SMB Gen2 · Gen3 · Barrel lookup
        </p>
      </header>

      <div className="mb-3 flex flex-wrap justify-center gap-2">
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

      <form onSubmit={onSubmit} className="mb-6 flex gap-2">
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
          <div className="grid gap-0 sm:grid-cols-[160px_1fr]">
            <div className="aspect-square bg-ink">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={primary.image || data?.rarity?.image || ""}
                alt={primary.name}
                className="h-full w-full object-cover"
                style={{ imageRendering: "pixelated" }}
              />
            </div>
            <div className="flex flex-col gap-2 p-4">
              <h2 className="text-[14px] text-banana">
                {primaryHref ? (
                  <Link href={primaryHref} className="hover:underline">
                    {primary.name}
                  </Link>
                ) : (
                  primary.name
                )}
              </h2>
              {data?.rarity?.rank != null && (
                <p className="text-[10px] text-muted">
                  Rank #{data.rarity.rank}
                </p>
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

      {gallery.length > 0 && (
        <section className="mt-6">
          <h3 className="mb-2 text-[11px] text-banana">
            {data?.kind === "sns" ? "SNS" : "Wallet"} ({gallery.length})
          </h3>
          <ul className="grid grid-cols-3 gap-2">
            {gallery.map((m) => {
              const href = monkeHref(m, collection);
              return (
                <li key={m.mint}>
                  <Link
                    href={href}
                    className="block border-2 border-border bg-card hover:border-banana"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m.image}
                      alt={m.name}
                      className="aspect-square w-full object-cover"
                      style={{ imageRendering: "pixelated" }}
                    />
                    <div className="truncate px-1 py-1 text-[8px] text-muted">
                      {m.name}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {data && !primary && gallery.length === 0 && !err && (
        <p className="text-center text-[11px] text-muted">No monke found.</p>
      )}

      <footer className="mt-auto pt-10 text-center text-[9px] text-muted">
        <p>
          <a
            href="https://metasal.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-banana hover:underline"
          >
            metasal.xyz
          </a>
          {" · "}
          <Link href="/support" className="text-banana hover:underline">
            support
          </Link>
        </p>
        {deeplinkPath ? (
          <span className="sr-only">path {deeplinkPath}</span>
        ) : null}
      </footer>
    </div>
  );
}
