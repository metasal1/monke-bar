import { ImageResponse } from "next/og";
import { howrareByNumber } from "@/lib/howrare";
import {
  isPathCollection,
  PATH_TO_COLLECTION,
  type PathCollection,
} from "@/lib/deeplink";
import { COLLECTIONS } from "@/lib/collections";
import { HOUSE_MONKE } from "@/lib/house-monke";

export const runtime = "nodejs";
export const alt = "monke.bar";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadPixelFont(): Promise<ArrayBuffer> {
  const bases = [
    "https://monke-bar.gm-4e8.workers.dev",
    "https://monke.bar",
    "https://monke.sol.new",
    process.env.NEXT_PUBLIC_SITE_URL,
  ].filter(Boolean) as string[];
  for (const base of bases) {
    try {
      const res = await fetch(`${base}/fonts/PressStart2P-Regular.ttf`, {
        next: { revalidate: 86400 },
      });
      if (res.ok) return await res.arrayBuffer();
    } catch {
      /* next */
    }
  }
  const res = await fetch(
    "https://github.com/google/fonts/raw/main/ofl/pressstart2p/PressStart2P-Regular.ttf"
  );
  if (!res.ok) throw new Error("pixel font fetch failed");
  return res.arrayBuffer();
}

export default async function Image({
  params,
}: {
  params: Promise<{ collection: string; id: string }>;
}) {
  const fontData = await loadPixelFont();
  const { collection, id } = await params;
  const valid = isPathCollection(collection) && /^\d{1,5}$/.test(id);
  const col = valid
    ? PATH_TO_COLLECTION[collection as PathCollection]
    : "smb_gen3";
  const num = valid ? Number(id) : HOUSE_MONKE.number;
  const rarity = await howrareByNumber(col, num);
  const name =
    rarity?.name ||
    (valid
      ? `${COLLECTIONS[col].numberPrefix} #${id}`
      : HOUSE_MONKE.name);
  const deeplink = valid
    ? `monke.bar/${collection}/${id}`
    : `monke.bar${HOUSE_MONKE.href}`;

  let dataUrl: string | null = null;
  if (rarity?.image) {
    try {
      const res = await fetch(rarity.image, {
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
            height: 64,
            background: "#2a1a10",
            borderBottom: "6px solid #4a3422",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffd84d",
            fontSize: 20,
            letterSpacing: 2,
          }}
        >
          ★ THE MONKE BAR ★
        </div>
        <div
          style={{
            display: "flex",
            flex: 1,
            padding: 40,
            gap: 32,
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
              boxShadow: "8px 8px 0 #000",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
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
              <div style={{ display: "flex", fontSize: 28, color: "#ffd84d" }}>
                SMB
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
            <div style={{ display: "flex", fontSize: 14, color: "#a89278" }}>
              monke.bar
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 28,
                color: "#ffd84d",
                lineHeight: 1.25,
                textShadow: "3px 3px 0 #000",
              }}
            >
              {name}
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
              {deeplink}
            </div>
            <div style={{ display: "flex", fontSize: 12, color: "#a89278" }}>
              Gen2 · Gen3 · Barrel
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            height: 48,
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
