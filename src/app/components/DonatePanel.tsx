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

export default function DonatePanel() {
  const [monkes, setMonkes] = useState(1);
  const usd = usdForMonkes(monkes);
  const payUrl = useMemo(
    () => buildSolanaPayUsdcUrl({ monkes }),
    [monkes]
  );

  useEffect(() => {
    track("donate_slider", { monkes, usd });
  }, [monkes, usd]);

  return (
    <section
      id="donate"
      className="mb-8 border-2 border-banana bg-wood px-3 py-4 pixel-frame sm:px-5"
      aria-labelledby="donate-heading"
    >
      <h2
        id="donate-heading"
        className="text-center text-[12px] leading-snug text-banana sm:text-[14px]"
      >
        KEEP THE BAR OPEN
      </h2>
      <p className="mx-auto mt-3 max-w-md text-center text-[10px] leading-relaxed text-muted sm:text-[11px]">
        monke.bar costs about{" "}
        <span className="text-banana">${USD_PER_MONKE} USDC per monke per year</span>{" "}
        to keep online — RPC, hosting, indexes. Slide monkes, scan Solana Pay.
      </p>

      <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:justify-center sm:gap-8">
        <div className="w-full max-w-xs flex-1">
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

          <a
            href={payUrl}
            className="mt-4 inline-flex w-full items-center justify-center border-2 border-black bg-banana px-3 py-3 text-[11px] font-semibold text-ink pixel-btn"
            onClick={() =>
              track("donate_open", { monkes, usd, method: "solana_pay_link" })
            }
          >
            OPEN IN WALLET · ${usd}
          </a>
          <p className="mt-2 break-all text-center text-[8px] text-muted">
            to {shortAddr(DONATE_RECIPIENT)} · USDC
          </p>
        </div>

        <div className="flex flex-col items-center">
          <div className="border-2 border-banana bg-white p-2 shadow-[4px_4px_0_#000]">
            <QRCodeSVG
              value={payUrl}
              size={168}
              level="M"
              bgColor="#ffffff"
              fgColor="#0a0705"
              includeMargin={false}
            />
          </div>
          <p className="mt-2 max-w-[180px] text-center text-[9px] leading-relaxed text-muted">
            Scan with Phantom / Solflare · Solana Pay · ${usd} USDC
          </p>
          <button
            type="button"
            className="mt-2 border-2 border-border bg-card px-3 py-2 text-[9px] text-banana pixel-btn hover:border-banana"
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
        </div>
      </div>
    </section>
  );
}
