import { NextResponse } from "next/server";
import { getOpenListings } from "@/lib/auditionListings";

export const runtime = "nodejs";

/** Public — only listings admins have marked open and not past deadline. */
export async function GET() {
  // `getOpenListings()` is async (it hits Supabase). The previous version
  // returned the unresolved Promise — `NextResponse.json` serialized it
  // to `{}`, which broke the picker AND the empty state on /support.
  return NextResponse.json({ listings: await getOpenListings() });
}
