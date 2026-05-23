import path from "node:path";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { serverClient, storageUrl } from "@/lib/db";

export const runtime = "nodejs";

const ALLOWED_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const BUCKET = "covers";

/** List current cover photos from Supabase Storage. */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sb = serverClient();
  const { data, error } = await sb.storage.from(BUCKET).list("", {
    limit: 100,
    sortBy: { column: "name", order: "asc" },
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const files = (data ?? [])
    .filter(
      (f) =>
        f.name &&
        !f.name.startsWith(".") &&
        !f.name.startsWith("_") &&
        ALLOWED_EXTS.has(path.extname(f.name).toLowerCase()),
    )
    .map((f) => ({
      name: f.name,
      url: storageUrl(BUCKET, f.name),
      size: f.metadata?.size ?? 0,
    }));
  return NextResponse.json({ files });
}

/**
 * Multi-file upload to the `covers` bucket. Same validation rules as the
 * old filesystem version — allowed extensions, 10 MB max, URL-safe slug
 * for the key.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Bad form data" }, { status: 400 });
  }

  const files = form.getAll("file").filter((v): v is File => v instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "No files in upload" }, { status: 400 });
  }

  const sb = serverClient();
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

    // Slugify the basename — Supabase Storage rejects non-ASCII keys.
    const stem = path.basename(origName, ext);
    const safeStem =
      stem
        .normalize("NFKC")
        .replace(/[^a-zA-Z0-9._-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80) || "cover";

    // Avoid clobber: probe and append `-2`, `-3`, … on conflict.
    let finalName = `${safeStem}${ext}`;
    let n = 2;
    const { data: existing } = await sb.storage.from(BUCKET).list("", {
      limit: 200,
    });
    const taken = new Set((existing ?? []).map((f) => f.name));
    while (taken.has(finalName)) {
      finalName = `${safeStem}-${n}${ext}`;
      n++;
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const { error } = await sb.storage.from(BUCKET).upload(finalName, buf, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (error) {
      results.push({ name: origName, saved: false, reason: error.message });
    } else {
      results.push({ name: finalName, saved: true });
    }
  }

  return NextResponse.json({ results });
}
