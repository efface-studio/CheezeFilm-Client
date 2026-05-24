import path from "node:path";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { serverClient, storageUrl } from "@/lib/db";
import { bumpCovers } from "@/lib/revalidate";
import { detectImageMime, type DetectedImageMime } from "@/lib/imageValidate";

export const runtime = "nodejs";

const ALLOWED_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME: ReadonlyArray<DetectedImageMime> = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

/**
 * Hard cap on how many cover photos can live in the bucket at once.
 * The home hero's slideshow is built to cycle through them all, so
 * shipping more makes the rotation too slow and pads page weight
 * with unused preloads. Admin upload refuses anything that would
 * push the total over this number.
 */
const MAX_COVERS = 10;

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
  return NextResponse.json({ files, maxCovers: MAX_COVERS });
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

  // Probe the current bucket count before starting. The per-file save
  // loop also re-checks `taken` against existing names for collisions,
  // but the *cap* needs to be checked up front so we never even start
  // saving when the user is over the limit.
  const { data: existingBefore } = await sb.storage.from(BUCKET).list("", {
    limit: 200,
  });
  const existingCovers = (existingBefore ?? []).filter((f) => {
    const name = f.name;
    if (!name || name.startsWith(".") || name.startsWith("_")) return false;
    return ALLOWED_EXTS.has(path.extname(name).toLowerCase());
  });
  const remainingSlots = Math.max(0, MAX_COVERS - existingCovers.length);
  if (remainingSlots === 0) {
    return NextResponse.json(
      {
        error: `이미 ${MAX_COVERS}장이 등록되어 있어요. 새 표지를 올리려면 먼저 기존 사진을 삭제해주세요.`,
        currentCount: existingCovers.length,
        maxCovers: MAX_COVERS,
      },
      { status: 400 },
    );
  }

  const results: Array<{ name: string; saved: boolean; reason?: string }> = [];
  let savedSoFar = 0;
  for (const file of files) {
    // Stop accepting more uploads once we'd cross the cap, even if the
    // user dropped more files than there's room for.
    if (savedSoFar >= remainingSlots) {
      results.push({
        name: file.name || "upload",
        saved: false,
        reason: `한 번에 ${remainingSlots}장까지만 추가 가능 (전체 한도 ${MAX_COVERS}장)`,
      });
      continue;
    }
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
    // Magic-byte check: client-supplied `file.type` is unreliable, so
    // sniff the bytes and use the detected MIME for the stored
    // content-type. Reject if the actual content isn't a real image of
    // an allowed flavour even if the extension said it was.
    const detected = detectImageMime(buf);
    if (!detected || !ALLOWED_MIME.includes(detected)) {
      results.push({
        name: origName,
        saved: false,
        reason: "file content is not a valid JPEG/PNG/WebP image",
      });
      continue;
    }
    const { error } = await sb.storage.from(BUCKET).upload(finalName, buf, {
      contentType: detected,
      upsert: false,
    });
    if (error) {
      results.push({ name: origName, saved: false, reason: error.message });
    } else {
      results.push({ name: finalName, saved: true });
      savedSoFar += 1;
    }
  }

  if (results.some((r) => r.saved)) bumpCovers();
  return NextResponse.json({
    results,
    maxCovers: MAX_COVERS,
    currentCount: existingCovers.length + savedSoFar,
  });
}
