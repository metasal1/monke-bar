import { ImageResponse } from "next/og";
import { howrareByNumber } from "@/lib/howrare";
import { HOUSE_MONKE } from "@/lib/house-monke";

export const runtime = "nodejs";
export const alt = "monke.bar — THE MONKE BAR";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadPixelFont(): Promise<ArrayBuffer> {
  const bases = [
    "https://monke-bar.gm-4e8.workers.dev",
    "https://monke.bar",
    process.env.NEXT_PUBLIC_SITE_URL,
  ].filter(Boolean) as string[];
  for (const base of bases) {
    try {
      const res = await fetch(`${base}/fonts/PressStart2P-Regular.ttf`, {
        next: { revalidate: 86400 },
      });
      if (res.ok) return await res.arrayBuffer();
    } catch {
      /* try next */
    }
  }
  // last resort: github raw
  const res = await fetch(
    "https://github.com/google/fonts/raw/main/ofl/pressstart2p/PressStart2P-Regular.ttf"
  );
  if (!res.ok) throw new Error("pixel font fetch failed");
  return res.arrayBuffer();
}

export default async function Image() {
  const fontData = await loadPixelFont();
  const rarity = await howrareByNumber("smb_gen3", HOUSE_MONKE.number);
  let dataUrl: string | null = null;
  const img = rarity?.image;
  if (img) {
    try {
      const res = await fetch(img, {
        headers: { "User-Agent": "monke.bar-og/1.0" },
        next: { revalidate: 3600 },
      });
      if (res.ok) {
        dataUrl = `data:image/png;base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
      }
    } catch {
      /* ignore */
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0a0705",
          color: "#f6edd8",
          fontFamily: "PressStart",
        }}
      >
        <div
          style={{
            display: "flex",
            height: 70,
            background: "#2a1a10",
            borderBottom: "6px solid #4a3422",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffd84d",
            fontSize: 22,
            letterSpacing: 2,
          }}
        >
          ★ THE MONKE BAR ★
        </div>
        <div
          style={{
            display: "flex",
            flex: 1,
            padding: 44,
            gap: 36,
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              width: 280,
              height: 280,
              background: "#1a120c",
              border: "6px solid #ffd84d",
              boxShadow: "8px 8px 0 #000",
              overflow: "hidden",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {dataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={dataUrl}
                width={268}
                height={268}
                style={{ objectFit: "cover", imageRendering: "pixelated" }}
              />
            ) : (
              <div style={{ display: "flex", fontSize: 48, color: "#ffd84d" }}>
                MONKE
              </div>
            )}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              gap: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 42,
                color: "#ffd84d",
                textShadow: "3px 3px 0 #000",
              }}
            >
              monke.bar
            </div>
            <div style={{ display: "flex", fontSize: 18, color: "#f6edd8" }}>
              SMB Gen2 · Gen3 · Barrel
            </div>
            <div style={{ display: "flex", fontSize: 16, color: "#39ff14" }}>
              {HOUSE_MONKE.name}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 8,
                padding: "12px 14px",
                background: "#2a1a10",
                border: "4px solid #ffd84d",
                color: "#ffd84d",
                fontSize: 14,
              }}
            >
              monke.bar{HOUSE_MONKE.href}
            </div>
            <div style={{ display: "flex", fontSize: 12, color: "#a89278" }}>
              # · mint · wallet · .sol
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            height: 52,
            background: "#2a1a10",
            borderTop: "6px solid #4a3422",
            alignItems: "center",
            justifyContent: "center",
            color: "#a89278",
            fontSize: 12,
          }}
        >
          Made with love · metasal.xyz
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "PressStart",
          data: fontData,
          style: "normal",
          weight: 400,
        },
      ],
    }
  );
}
