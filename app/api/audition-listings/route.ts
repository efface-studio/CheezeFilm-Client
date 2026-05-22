import { NextResponse } from "next/server";
import { getOpenListings } from "@/lib/auditionListings";

export const runtime = "nodejs";

/** Public — only listings admins have marked open and not past deadline. */
export async function GET() {
  return NextResponse.json({ listings: getOpenListings() });
}
