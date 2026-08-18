import { NextRequest, NextResponse } from "next/server";
import { getMeFloor } from "@/lib/magiceden";
import type { MonkeCollectionId } from "@/lib/collections";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const collection = (req.nextUrl.searchParams.get("collection") ||
    "smb_gen2") as MonkeCollectionId;
  try {
    const floor = await getMeFloor(collection);
    return NextResponse.json(
      { floor },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Floor failed" },
      { status: 500 }
    );
  }
}
