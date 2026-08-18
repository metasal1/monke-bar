"use client";

import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  DONATE_RECIPIENT,
  MAX_MONKES,
  MIN_MONKES,
  USD_PER_MONKE,
  buildSolanaPayUsdcUrl,
  usdForMonkes,
} from "@/lib/donate";
import { track } from "@/lib/analytics";

function shortAddr(a: string) {
  return `${a.slice(0, 4)}…${a.slice(-4)}`;
}

/** Link + left slide-over donate drawer */
export default function DonatePanel() {
  const [open, setOpen] = useState(false);
  const [monkes, setMonkes] = useState(1);
  const usd = usdForMonkes(monkes);
  const payUrl = useMemo(() => buildSolanaPayUsdcUrl({ monkes }), [monkes]);

  useEffect(() => {
    if (!open) return;
    track("donate_open_drawer", { monkes, usd });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, monkes, usd]);

  // deep link #donate
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#donate") setOpen(true);
  }, []);

  return (
    <>
      <p className="mt-3 text-center text-[10px] leading-relaxed text-muted">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-banana underline-offset-2 hover:underline"
        >
          Donate
        </button>
        {" · "}${USD_PER_MONKE}/monke/yr to keep monke.bar online
      </p>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/70 transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />

      {/* Left drawer */}
      <aside
        id="donate-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="donate-heading"
        className={`fixed left-0 top-0 z-50 flex h-full w-[min(100%,22rem)] flex-col border-r-2 border-banana bg-wood shadow-[8px_0_0_#000] transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b-2 border-border px-3 py-3">
          <h2
            id="donate-heading"
            className="text-[11px] leading-snug text-banana sm:text-[12px]"
          >
            KEEP THE BAR OPEN
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="border-2 border-border bg-card px-3 py-2 text-[10px] text-muted pixel-btn hover:border-banana hover:text-banana"
            aria-label="Close donate"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <p className="text-[10px] leading-relaxed text-muted sm:text-[11px]">
            monke.bar needs about{" "}
            <span className="text-banana">
              ${USD_PER_MONKE} USDC per monke per year
            </span>{" "}
            — RPC, hosting, indexes. Slide monkes, scan Solana Pay.
          </p>

          <div className="mt-5">
            <div className="flex items-end justify-between gap-2">
              <label
                htmlFor="monke-slider"
                className="text-[10px] text-muted sm:text-[11px]"
              >
                Monkes
              </label>
              <div className="text-right">
                <div className="text-[16px] text-banana sm:text-[18px]">
                  {monkes}
                </div>
                <div className="text-[10px] text-neon sm:text-[11px]">
                  ${usd} USDC
                </div>
              </div>
            </div>
            <input
              id="monke-slider"
              type="range"
              min={MIN_MONKES}
              max={MAX_MONKES}
              step={1}
              value={monkes}
              onChange={(e) => setMonkes(Number(e.target.value))}
              className="mt-3 w-full accent-[#ffd84d]"
              style={{ minHeight: 44 }}
              aria-valuemin={MIN_MONKES}
              aria-valuemax={MAX_MONKES}
              aria-valuenow={monkes}
              aria-label="Number of monkes to fund for one year"
            />
            <div className="mt-1 flex justify-between text-[8px] text-muted">
              <span>{MIN_MONKES}</span>
              <span>{MAX_MONKES}</span>
            </div>

            <p className="mt-4 text-[9px] leading-relaxed text-muted sm:text-[10px]">
              ${USD_PER_MONKE} × {monkes} monke{monkes === 1 ? "" : "s"} ={" "}
              <span className="text-banana">${usd} USDC / year</span>
              <br />
              Pays RPC + CF + keep the pixel lights on.
            </p>
          </div>

          <div className="mt-5 flex flex-col items-center">
            <div className="border-2 border-banana bg-white p-2 shadow-[4px_4px_0_#000]">
              <QRCodeSVG
                value={payUrl}
                size={180}
                level="M"
                bgColor="#ffffff"
                fgColor="#0a0705"
                includeMargin={false}
              />
            </div>
            <p className="mt-2 max-w-[200px] text-center text-[9px] leading-relaxed text-muted">
              Scan · Phantom / Solflare · Solana Pay · ${usd} USDC
            </p>
          </div>

          <a
            href={payUrl}
            className="mt-4 inline-flex w-full items-center justify-center border-2 border-black bg-banana px-3 py-3 text-[11px] font-semibold text-ink pixel-btn"
            onClick={() =>
              track("donate_open", { monkes, usd, method: "solana_pay_link" })
            }
          >
            OPEN IN WALLET · ${usd}
          </a>
          <button
            type="button"
            className="mt-2 w-full border-2 border-border bg-card px-3 py-2 text-[9px] text-banana pixel-btn hover:border-banana"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(payUrl);
                track("donate_copy", { monkes, usd });
              } catch {
                /* ignore */
              }
            }}
          >
            COPY PAY LINK
          </button>
          <p className="mt-3 break-all text-center text-[8px] text-muted">
            to {shortAddr(DONATE_RECIPIENT)} · USDC
          </p>
        </div>
      </aside>
    </>
  );
}
