import { ImageResponse } from "next/og";
import { HOUSE_MONKE } from "@/lib/house-monke";
import { howrareByNumber } from "@/lib/howrare";

export const runtime = "nodejs";
export const alt = "monke.bar — THE MONKE BAR";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
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
        const buf = Buffer.from(await res.arrayBuffer()).toString("base64");
        dataUrl = `data:image/png;base64,${buf}`;
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
          fontFamily: "monospace",
        }}
      >
        <div
          style={{
            display: "flex",
            height: 72,
            background: "#2a1a10",
            borderBottom: "6px solid #4a3422",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffd84d",
            fontSize: 28,
            letterSpacing: 2,
          }}
        >
          ★ THE MONKE BAR ★
        </div>
        <div
          style={{
            display: "flex",
            flex: 1,
            padding: 48,
            gap: 40,
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              width: 300,
              height: 300,
              background: "#1a120c",
              border: "6px solid #ffd84d",
              boxShadow: "10px 10px 0 #000",
              overflow: "hidden",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {dataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={dataUrl}
                width={288}
                height={288}
                style={{ objectFit: "cover", imageRendering: "pixelated" }}
              />
            ) : (
              <div style={{ display: "flex", fontSize: 72, color: "#ffd84d" }}>
                🐵
              </div>
            )}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              gap: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 56,
                color: "#ffd84d",
                textShadow: "4px 4px 0 #000",
              }}
            >
              monke.bar
            </div>
            <div style={{ display: "flex", fontSize: 30, color: "#f6edd8" }}>
              SMB Gen2 · Gen3 · Barrel lookup
            </div>
            <div style={{ display: "flex", fontSize: 24, color: "#39ff14" }}>
              House monke {HOUSE_MONKE.name}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 10,
                padding: "14px 18px",
                background: "#2a1a10",
                border: "4px solid #ffd84d",
                color: "#ffd84d",
                fontSize: 24,
              }}
            >
              monke.bar{HOUSE_MONKE.href}
            </div>
            <div style={{ display: "flex", fontSize: 20, color: "#a89278" }}>
              # · mint · wallet · .sol · Tensor · Magic Eden
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            height: 56,
            background: "#2a1a10",
            borderTop: "6px solid #4a3422",
            alignItems: "center",
            justifyContent: "center",
            color: "#a89278",
            fontSize: 20,
          }}
        >
          Made with love · metasal.xyz
        </div>
      </div>
    ),
    { ...size }
  );
}
