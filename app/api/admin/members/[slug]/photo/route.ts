import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { findMember, updateMember } from "@/lib/members";
import { serverClient, storageUrl } from "@/lib/db";
import { bumpMembers } from "@/lib/revalidate";
import { detectImageMime, type DetectedImageMime } from "@/lib/imageValidate";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const MIME_TO_EXT: Record<DetectedImageMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

const ALLOWED_MIME: ReadonlyArray<DetectedImageMime> = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

/**
 * Storage keys must be ASCII. Korean slugs get hashed into `m-<sha1>`
 * which matches the convention the migration script established.
 */
function safeKey(slug: string, ext: string): string {
  const safe = /^[a-zA-Z0-9._-]+$/.test(slug)
    ? slug
    : `m-${crypto.createHash("sha1").update(slug).digest("hex").slice(0, 16)}`;
  return `${safe}.${ext}`;
}

async function deleteExistingPhoto(currentPath: string | undefined) {
  if (!currentPath) return;
  const sb = serverClient();
  await sb.storage.from("members").remove([currentPath]);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const member = await findMember(slug);
  if (!member) {
    return NextResponse.json({ error: "Unknown member" }, { status: 404 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form" }, { status: 400 });
  }

  const file = form.get("photo");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "photo 파일이 비어있습니다." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `파일이 너무 큽니다 (최대 ${MAX_BYTES / 1024 / 1024} MB).` },
      { status: 400 },
    );
  }

  // Magic-byte check before any I/O. `file.type` is whatever the browser
  // sent — uploading a JS file labeled `image/png` is trivial. Sniff
  // the actual bytes and use the detected MIME for both the bucket
  // content-type and the chosen extension.
  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = detectImageMime(buffer);
  if (!detected || !ALLOWED_MIME.includes(detected)) {
    return NextResponse.json(
      { error: "JPEG / PNG / WebP만 업로드할 수 있어요." },
      { status: 400 },
    );
  }
  const ext = MIME_TO_EXT[detected];

  // Replace any older variant for this member first (key may differ if the
  // previous upload was a different extension).
  await deleteExistingPhoto(member.photoPath);

  const sb = serverClient();
  const key = safeKey(slug, ext);
  const { error: upErr } = await sb.storage
    .from("members")
    .upload(key, buffer, {
      contentType: detected,
      upsert: true,
    });
  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }
  await updateMember(slug, { photoPath: key });
  bumpMembers();

  return NextResponse.json({
    ok: true,
    // Append a timestamp so the admin UI's <img> reloads without cache.
    photoUrl: `${storageUrl("members", key)}?t=${Date.now()}`,
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const member = await findMember(slug);
  if (!member) {
    return NextResponse.json({ error: "Unknown member" }, { status: 404 });
  }
  await deleteExistingPhoto(member.photoPath);
  await updateMember(slug, { photoPath: undefined });
  bumpMembers();
  return NextResponse.json({ ok: true });
}
