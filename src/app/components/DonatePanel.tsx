"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  DONATE_RECIPIENT,
  MAX_DONATE_USD,
  MIN_DONATE_USD,
  YEARLY_GOAL_USD,
  buildSolanaPayUsdcUrl,
  shortAddr,
} from "@/lib/donate";
import { track } from "@/lib/analytics";

interface BalResp {
  wallet: string;
  sol?: number;
  usdc?: number;
  solUsd?: number | null;
  totalUsd?: number | null;
  yearlyGoalUsd?: number;
  progressPct?: number | null;
  remainingUsd?: number;
  error?: string;
}

function fmtUsd(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `$${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtSol(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

type Props = {
  /** Show compact header button instead of text link */
  variant?: "link" | "button";
  className?: string;
};

/** Donate trigger + left slide-over drawer */
export default function DonatePanel({
  variant = "link",
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(YEARLY_GOAL_USD);
  const [bal, setBal] = useState<BalResp | null>(null);
  const [balLoading, setBalLoading] = useState(false);

  const payUrl = useMemo(
    () => buildSolanaPayUsdcUrl({ amountUsd: amount }),
    [amount]
  );

  const loadBal = useCallback(async () => {
    setBalLoading(true);
    try {
      const res = await fetch("/api/donate-balance");
      const json = (await res.json()) as BalResp;
      setBal(json);
      if (json.remainingUsd != null && json.remainingUsd > 0) {
        setAmount(
          Math.min(
            MAX_DONATE_USD,
            Math.max(MIN_DONATE_USD, Math.ceil(json.remainingUsd))
          )
        );
      }
    } catch {
      setBal({ wallet: DONATE_RECIPIENT, error: "Could not load balance" });
    } finally {
      setBalLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadBal();
    track("donate_open_drawer", { amount });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loadBal]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#donate") setOpen(true);
  }, []);

  const goal = bal?.yearlyGoalUsd ?? YEARLY_GOAL_USD;
  const totalUsd = bal?.totalUsd;
  const progress = bal?.progressPct;
  const remaining = bal?.remainingUsd;

  const trigger =
    variant === "button" ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`min-h-[48px] rounded-none border-2 border-banana bg-wood px-4 py-3 text-[11px] font-semibold text-banana pixel-btn hover:bg-banana hover:text-ink ${className}`}
      >
        Donate
      </button>
    ) : (
      <p
        className={`mt-3 text-center text-[10px] leading-relaxed text-muted ${className}`}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-banana underline-offset-2 hover:underline"
        >
          Donate
        </button>
        {" · "}we need ${YEARLY_GOAL_USD}/yr to keep monke.bar running
      </p>
    );

  return (
    <>
      {trigger}

      <div
        className={`fixed inset-0 z-40 bg-black/70 transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />

      <aside
        id="donate-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="donate-heading"
        className={`fixed left-0 top-0 z-50 flex h-[100dvh] w-[min(100%,22rem)] flex-col border-r-2 border-banana bg-wood shadow-[8px_0_0_#000] transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div
          className="flex items-center justify-between border-b-2 border-border px-3 py-3"
          style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
        >
          <h2
            id="donate-heading"
            className="text-[11px] leading-snug text-banana sm:text-[12px]"
          >
            KEEP THE BAR OPEN
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="min-h-[44px] min-w-[44px] border-2 border-border bg-card px-3 py-2 text-[10px] text-muted pixel-btn hover:border-banana hover:text-banana"
            aria-label="Close donate"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-4">
          <p className="text-[10px] leading-relaxed text-muted sm:text-[11px]">
            We need <span className="text-banana">${goal} a year</span> to keep
            the site running — RPC, hosting, indexes.
          </p>

          <div className="mt-4 border-2 border-border bg-card px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] uppercase tracking-wider text-muted">
                Runway wallet
              </span>
              <button
                type="button"
                onClick={() => void loadBal()}
                className="min-h-[36px] text-[9px] text-banana hover:underline"
                disabled={balLoading}
              >
                {balLoading ? "…" : "refresh"}
              </button>
            </div>
            <a
              href={`https://solscan.io/account/${DONATE_RECIPIENT}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block break-all text-[9px] text-banana hover:underline"
              title={DONATE_RECIPIENT}
            >
              {shortAddr(DONATE_RECIPIENT, 6)}
            </a>

            <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <div className="text-[8px] text-muted">SOL</div>
                <div className="text-banana">{fmtSol(bal?.sol)}</div>
              </div>
              <div>
                <div className="text-[8px] text-muted">USDC</div>
                <div className="text-banana">
                  {bal?.usdc != null
                    ? bal.usdc.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })
                    : "—"}
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-[8px] text-muted">≈ balance</div>
                <div className="text-[14px] text-neon">{fmtUsd(totalUsd)}</div>
              </div>
            </div>

            <div className="mt-3">
              <div className="mb-1 flex justify-between text-[8px] text-muted">
                <span>Yearly goal ${goal}</span>
                <span>{progress != null ? `${progress}%` : "—"}</span>
              </div>
              <div className="h-3 border-2 border-black bg-ink">
                <div
                  className="h-full bg-banana transition-all"
                  style={{
                    width: `${progress != null ? Math.min(100, progress) : 0}%`,
                  }}
                />
              </div>
              <p className="mt-2 text-[9px] leading-relaxed text-muted">
                {remaining != null && remaining > 0 ? (
                  <>
                    Still need about{" "}
                    <span className="text-banana">{fmtUsd(remaining)}</span> this
                    year.
                  </>
                ) : totalUsd != null && totalUsd >= goal ? (
                  <span className="text-neon">Goal covered — thank you.</span>
                ) : (
                  <>Target ${goal}/yr to keep monke.bar online.</>
                )}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-end justify-between gap-2">
              <label
                htmlFor="donate-slider"
                className="text-[10px] text-muted sm:text-[11px]"
              >
                Donate (USDC)
              </label>
              <div className="text-[16px] text-banana sm:text-[18px]">
                ${amount}
              </div>
            </div>
            <input
              id="donate-slider"
              type="range"
              min={MIN_DONATE_USD}
              max={MAX_DONATE_USD}
              step={1}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="mt-3 w-full accent-[#ffd84d]"
              style={{ minHeight: 48 }}
              aria-valuemin={MIN_DONATE_USD}
              aria-valuemax={MAX_DONATE_USD}
              aria-valuenow={amount}
              aria-label="USDC amount to donate"
            />
            <div className="mt-1 flex justify-between text-[8px] text-muted">
              <span>${MIN_DONATE_USD}</span>
              <span>${MAX_DONATE_USD}</span>
            </div>
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
              Scan · Phantom / Solflare · Solana Pay · ${amount} USDC
            </p>
          </div>

          <a
            href={payUrl}
            className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center border-2 border-black bg-banana px-3 py-3 text-[11px] font-semibold text-ink pixel-btn"
            onClick={() =>
              track("donate_open", { amount, method: "solana_pay_link" })
            }
          >
            OPEN IN WALLET · ${amount}
          </a>
          <button
            type="button"
            className="mt-2 min-h-[44px] w-full border-2 border-border bg-card px-3 py-2 text-[9px] text-banana pixel-btn hover:border-banana"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(payUrl);
                track("donate_copy", { amount });
              } catch {
                /* ignore */
              }
            }}
          >
            COPY PAY LINK
          </button>
          <p className="mt-3 break-all text-center text-[8px] text-muted">
            to {shortAddr(DONATE_RECIPIENT, 6)} · USDC
          </p>
        </div>
      </aside>
    </>
  );
}
