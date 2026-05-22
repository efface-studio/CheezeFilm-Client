import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { getSession } from "@/lib/auth";
import {
  deleteMember,
  findMember,
  updateMember,
  type Member,
} from "@/lib/members";

export const runtime = "nodejs";

const ACCENTS = ["purple", "yellow", "wine", "charcoal", "olive", "cream"] as const;
const ROLES = ["lead", "actor", "writer", "director"] as const;
const PHOTO_EXTS = [".jpg", ".jpeg", ".png", ".webp"];

type PatchBody = Partial<Member>;

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  if (!findMember(slug)) {
    return NextResponse.json({ error: "존재하지 않는 멤버입니다." }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as PatchBody;

  // Validate any fields that are actually present.
  if (body.name !== undefined && !String(body.name).trim()) {
    return NextResponse.json({ error: "이름은 비울 수 없습니다." }, { status: 400 });
  }
  if (body.accent !== undefined && !ACCENTS.includes(body.accent as typeof ACCENTS[number])) {
    return NextResponse.json({ error: "잘못된 accent 값입니다." }, { status: 400 });
  }
  if (body.role !== undefined && !ROLES.includes(body.role as typeof ROLES[number])) {
    return NextResponse.json({ error: "잘못된 role 값입니다." }, { status: 400 });
  }
  if (body.works !== undefined && !Array.isArray(body.works)) {
    return NextResponse.json({ error: "works는 배열이어야 합니다." }, { status: 400 });
  }

  updateMember(slug, body);
  return NextResponse.json({ ok: true });
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
    return NextResponse.json({ error: "존재하지 않는 멤버입니다." }, { status: 404 });
  }

  // Best-effort wipe of the uploaded photo file too — otherwise the
  // public/members/<slug>.* would be a dangling reference to a deleted row.
  const dir = path.join(process.cwd(), "public", "members");
  await Promise.all(
    PHOTO_EXTS.map(async (ext) => {
      const f = path.join(dir, `${slug}${ext}`);
      try {
        await fs.unlink(f);
      } catch {
        /* file didn't exist — fine */
      }
    }),
  );

  deleteMember(slug);
  return NextResponse.json({ ok: true });
}
