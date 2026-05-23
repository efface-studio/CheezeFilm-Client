import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

const COVERS_DIR = path.join(process.cwd(), "public", "covers");

/**
 * Delete one cover photo by filename. The filename is taken from the URL
 * path; we explicitly reject `..` and absolute paths to keep this from
 * being a directory-traversal hole.
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
  // Reject anything that tries to climb the tree. `basename` strips dirs;
  // we then require the result to equal the input so `../foo` and `/x/y`
  // get caught (their basename would differ).
  if (decoded !== path.basename(decoded) || decoded.includes("..")) {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }

  const target = path.join(COVERS_DIR, decoded);
  if (!fs.existsSync(target)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    fs.unlinkSync(target);
    return NextResponse.json({ deleted: decoded });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "delete failed" },
      { status: 500 },
    );
  }
}
