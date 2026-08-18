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

async function loadMonkeImage(url: string): Promise<ArrayBuffer | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "monke.bar-og/1.0" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

export default async function Image({
  params,
}: {
  params: Promise<{ collection: string; id: string }>;
}) {
  const { collection, id } = await params;
  const valid =
    isPathCollection(collection) && /^\d{1,5}$/.test(id);
  const col = valid
    ? PATH_TO_COLLECTION[collection as PathCollection]
    : "smb_gen2";
  const num = valid ? Number(id) : HOUSE_MONKE.number;
  const rarity = valid ? await howrareByNumber(col, num) : null;
  const name = rarity?.name ||
    (valid
      ? `${COLLECTIONS[col].numberPrefix} #${id}`
      : HOUSE_MONKE.name);
  const deeplink = valid
    ? `monke.bar/${collection}/${id}`
    : `monke.bar${HOUSE_MONKE.href}`;
  const rank =
    rarity?.rank != null ? `HowRare #${rarity.rank}` : "SMB lookup";

  let imgSrc: string | null = rarity?.image || null;
  // absolute URL for external images in ImageResponse
  if (imgSrc && imgSrc.startsWith("http")) {
    // keep
  } else if (!imgSrc) {
    imgSrc = null;
  }

  // Prefer data URL buffer when fetch works (more reliable on Workers)
  let dataUrl: string | null = null;
  if (imgSrc) {
    const buf = await loadMonkeImage(imgSrc);
    if (buf) {
      const b64 = Buffer.from(buf).toString("base64");
      const ct = imgSrc.includes("irys") || imgSrc.includes("arweave")
        ? "image/png"
        : "image/png";
      dataUrl = `data:${ct};base64,${b64}`;
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
            padding: 40,
            gap: 36,
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              width: 320,
              height: 320,
              background: "#1a120c",
              border: "6px solid #ffd84d",
              boxShadow: "10px 10px 0 #000",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {dataUrl || imgSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={dataUrl || imgSrc!}
                width={308}
                height={308}
                style={{ objectFit: "cover", imageRendering: "pixelated" }}
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  fontSize: 48,
                  color: "#ffd84d",
                }}
              >
                🐵
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
                fontSize: 22,
                color: "#a89278",
                letterSpacing: 2,
              }}
            >
              monke.bar deeplink
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 52,
                color: "#ffd84d",
                lineHeight: 1.15,
                textShadow: "4px 4px 0 #000",
              }}
            >
              {name}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 28,
                color: "#39ff14",
              }}
            >
              {rank}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 12,
                padding: "14px 18px",
                background: "#2a1a10",
                border: "4px solid #ffd84d",
                color: "#ffd84d",
                fontSize: 26,
                letterSpacing: 1,
              }}
            >
              {deeplink}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 20,
                color: "#a89278",
                marginTop: 8,
              }}
            >
              Tensor · Magic Eden · Gen2 Gen3 Barrel
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
