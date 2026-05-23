import path from "node:path";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { serverClient } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Delete one cover photo from Supabase Storage by filename. Filename
 * comes from the URL; we reject `..` and any path that contains
 * directory separators to avoid touching other buckets/objects.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name: raw } = await params;
  const decoded = decodeURIComponent(raw);
  if (decoded !== path.basename(decoded) || decoded.includes("..")) {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }

  const sb = serverClient();
  const { error } = await sb.storage.from("covers").remove([decoded]);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ deleted: decoded });
}
