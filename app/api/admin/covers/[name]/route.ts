import path from "node:path";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { serverClient } from "@/lib/db";
import { bumpCovers } from "@/lib/revalidate";
import { auditLog } from "@/lib/auditLog";

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
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }
  // Belt-and-braces filename validation. Beyond the original `basename`
  // check (catches `/`), we also reject:
  //   - empty / dotfile names
  //   - backslash (Windows-style separator that Supabase Storage keys treat as path)
  //   - NUL byte (truncates strings in some downstream tools)
  //   - any `..` segment
  // and require the name to match a conservative allowlist of chars +
  // the configured allowed extensions.
  if (
    !decoded ||
    decoded !== path.basename(decoded) ||
    decoded.includes("..") ||
    decoded.includes("\\") ||
    decoded.includes("\0") ||
    decoded.startsWith(".") ||
    !/^[a-zA-Z0-9._-]+$/.test(decoded)
  ) {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }

  const sb = serverClient();
  const { error } = await sb.storage.from("covers").remove([decoded]);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  bumpCovers();
  auditLog({
    action: "delete",
    resource: "cover_photo",
    id: decoded,
    username: session.username,
  });
  return NextResponse.json({ deleted: decoded });
}
