import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { serverClient } from "@/lib/db";
import {
  deleteMember,
  findMember,
  updateMember,
  type Member,
} from "@/lib/members";
import { bumpMembers } from "@/lib/revalidate";

export const runtime = "nodejs";

const ACCENTS = ["purple", "yellow", "wine", "charcoal", "olive", "cream"] as const;
const ROLES = ["lead", "actor", "writer", "director"] as const;

type PatchBody = Partial<Member>;

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  if (!(await findMember(slug))) {
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

  await updateMember(slug, body);
  bumpMembers();
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
  const member = await findMember(slug);
  if (!member) {
    return NextResponse.json({ error: "존재하지 않는 멤버입니다." }, { status: 404 });
  }

  // Best-effort wipe of the uploaded photo too so we don't leave an
  // orphaned object in Storage.
  if (member.photoPath) {
    const sb = serverClient();
    await sb.storage.from("members").remove([member.photoPath]);
  }

  await deleteMember(slug);
  bumpMembers();
  return NextResponse.json({ ok: true });
}
