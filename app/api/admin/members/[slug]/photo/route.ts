import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { getSession } from "@/lib/auth";
import { findMember } from "@/lib/members";

export const runtime = "nodejs";

const MEMBERS_DIR = path.join(process.cwd(), "public", "members");
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

async function deleteExistingPhotos(slug: string) {
  await fs.mkdir(MEMBERS_DIR, { recursive: true });
  const entries = await fs.readdir(MEMBERS_DIR).catch(() => [] as string[]);
  await Promise.all(
    entries
      .filter((name) => name.startsWith(`${slug}.`))
      .map((name) => fs.unlink(path.join(MEMBERS_DIR, name))),
  );
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  if (!findMember(slug)) {
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

  const ext = MIME_TO_EXT[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "JPEG / PNG / WebP만 업로드할 수 있어요." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `파일이 너무 큽니다 (최대 ${MAX_BYTES / 1024 / 1024} MB).` },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  await deleteExistingPhotos(slug); // remove any older variants
  const dest = path.join(MEMBERS_DIR, `${slug}.${ext}`);
  await fs.writeFile(dest, buffer);

  return NextResponse.json({
    ok: true,
    photoUrl: `/members/${slug}.${ext}?t=${Date.now()}`,
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
  if (!findMember(slug)) {
    return NextResponse.json({ error: "Unknown member" }, { status: 404 });
  }
  await deleteExistingPhotos(slug);
  return NextResponse.json({ ok: true });
}
