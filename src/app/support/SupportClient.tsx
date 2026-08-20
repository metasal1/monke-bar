"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import DonatePanel from "@/app/components/DonatePanel";
import ShareButtons from "@/app/components/ShareButtons";
import { meCollectionUrl, tensorCollectionUrl } from "@/lib/markets";
import { track } from "@/lib/analytics";
import { HOUSE_MONKE } from "@/lib/house-monke";

interface Floor {
  floorSol: number | null;
  listedCount: number | null;
  volume24hSol: number | null;
}

function fmtSol(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} SOL`;
}

export default function SupportPage() {
  const [floor, setFloor] = useState<Floor | null>(null);

  const loadFloor = useCallback(async () => {
    try {
      const res = await fetch("/api/floor?collection=smb_gen2");
      if (res.ok) setFloor((await res.json()) as Floor);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void loadFloor();
  }, [loadFloor]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-4 pb-16 pt-10 sm:px-6">
      <header className="mb-8 text-center">
        <p className="text-[10px] text-muted">
          <Link href="/" className="text-banana hover:underline">
            ← monke.bar
          </Link>
        </p>
        <h1 className="mt-3 text-[18px] text-banana">Support</h1>
        <p className="mt-2 text-[10px] leading-relaxed text-muted">
          Floors, share, donate — kept off the main lookup.
        </p>
      </header>

      <section className="mb-8 border-2 border-border bg-card p-4">
        <h2 className="text-[12px] text-banana">Gen2 floor</h2>
        <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
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
            <div className="text-muted">24h vol</div>
            <div className="text-banana">{fmtSol(floor?.volume24hSol)}</div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-[10px]">
          {meCollectionUrl("smb_gen2") && (
            <a
              href={meCollectionUrl("smb_gen2")!}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="text-banana hover:underline"
              onClick={() =>
                track("outbound_market", {
                  venue: "magic_eden_collection",
                  collection: "smb_gen2",
                })
              }
            >
              Magic Eden
            </a>
          )}
          {tensorCollectionUrl("smb_gen2") && (
            <a
              href={tensorCollectionUrl("smb_gen2")!}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="text-banana hover:underline"
              onClick={() =>
                track("outbound_market", {
                  venue: "tensor_collection",
                  collection: "smb_gen2",
                })
              }
            >
              Tensor
            </a>
          )}
        </div>
      </section>

      <section className="mb-8 border-2 border-border bg-card p-4">
        <h2 className="mb-3 text-[12px] text-banana">Share monke.bar</h2>
        <ShareButtons title="monke.bar — Solana Monke lookup" path="/" />
      </section>

      <section className="mb-8 border-2 border-border bg-card p-4">
        <h2 className="mb-2 text-[12px] text-banana">Donate</h2>
        <p className="mb-3 text-[10px] leading-relaxed text-muted">
          Open the drawer for runway wallet balance + Solana Pay ($55/yr goal).
        </p>
        {/* DonatePanel includes the footer-style link + left drawer */}
        <DonatePanel />
      </section>

      <section className="mb-8 border-2 border-border bg-card p-4 text-[10px] text-muted">
        <h2 className="mb-2 text-[12px] text-banana">Links</h2>
        <ul className="space-y-2">
          <li>
            <Link href={HOUSE_MONKE.href} className="text-banana hover:underline">
              {HOUSE_MONKE.name}
            </Link>
          </li>
          <li>
            <a
              href="https://metasal.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-banana hover:underline"
            >
              metasal.xyz
            </a>
          </li>
          <li>
            <a
              href="https://monke.sol.new"
              className="text-banana hover:underline"
            >
              monke.sol.new
            </a>
          </li>
        </ul>
      </section>

      <footer className="mt-auto text-center text-[9px] text-muted">
        <Link href="/" className="text-banana hover:underline">
          Back to lookup
        </Link>
      </footer>
    </div>
  );
}
