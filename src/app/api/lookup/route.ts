import { NextRequest, NextResponse } from "next/server";
import { lookupMonke } from "@/lib/lookup";
import type { MonkeCollectionId } from "@/lib/collections";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const collection = (req.nextUrl.searchParams.get("collection") ||
    "smb_gen2") as MonkeCollectionId;
  const preferWallet = req.nextUrl.searchParams.get("wallet") === "1";

  if (!q) {
    return NextResponse.json(
      { error: "Missing q (monke #, mint, or wallet)" },
      { status: 400 }
    );
  }

  try {
    const result = await lookupMonke(q, {
      collectionId: collection,
      preferWallet,
    });
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Lookup failed",
      },
      { status: 500 }
    );
  }
}
