import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

const COVERS_DIR = path.join(process.cwd(), "public", "covers");
const ALLOWED_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB per file — enough for a 4K landscape JPG

function ensureDir() {
  fs.mkdirSync(COVERS_DIR, { recursive: true });
}

/** List current cover photos, sorted by filename so the order matches what
 *  the public hero shows. */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  ensureDir();
  const names = fs
    .readdirSync(COVERS_DIR)
    .filter(
      (name) =>
        !name.startsWith(".") &&
        !name.startsWith("_") &&
        ALLOWED_EXTS.has(path.extname(name).toLowerCase()),
    )
    .sort((a, b) => a.localeCompare(b, "en"));
  return NextResponse.json({
    files: names.map((name) => ({
      name,
      url: `/covers/${name}`,
      size: fs.statSync(path.join(COVERS_DIR, name)).size,
    })),
  });
}

/**
 * Multi-file upload. Accepts `multipart/form-data` with one or more
 * `file` fields. Each file:
 *   - must have an allowed extension,
 *   - is renamed to a URL-safe slug while preserving the original stem so
 *     the user can recognise it in the public listing,
 *   - is rejected over `MAX_BYTES`.
 *
 * Returns a summary of what was saved vs. skipped so the client can show
 * per-file feedback.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  ensureDir();

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Bad form data" }, { status: 400 });
  }

  const files = form.getAll("file").filter((v): v is File => v instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "No files in upload" }, { status: 400 });
  }

  const results: Array<{ name: string; saved: boolean; reason?: string }> = [];
  for (const file of files) {
    const origName = file.name || "upload";
    const ext = path.extname(origName).toLowerCase();
    if (!ALLOWED_EXTS.has(ext)) {
      results.push({ name: origName, saved: false, reason: "ext not allowed" });
      continue;
    }
    if (file.size > MAX_BYTES) {
      results.push({ name: origName, saved: false, reason: "too large (>10MB)" });
      continue;
    }

    // Slugify the basename — Korean stems are fine but spaces / weird chars
    // bite us when the URL hits middleware. Keep letters, numbers, dash,
    // underscore, dot; replace everything else with a dash.
    const stem = path.basename(origName, ext);
    const safeStem =
      stem
        .normalize("NFKC")
        .replace(/[^\p{L}\p{N}._-]+/gu, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80) || "cover";

    // Avoid clobber: if `<stem><ext>` exists, append `-<n>` until free.
    let finalName = `${safeStem}${ext}`;
    let n = 2;
    while (fs.existsSync(path.join(COVERS_DIR, finalName))) {
      finalName = `${safeStem}-${n}${ext}`;
      n++;
    }

    const buf = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(path.join(COVERS_DIR, finalName), buf);
    results.push({ name: finalName, saved: true });
  }

  return NextResponse.json({ results });
}
