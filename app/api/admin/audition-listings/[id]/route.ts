import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  deleteListing,
  findListing,
  ROLE_TYPES,
  STATUSES,
  updateListing,
} from "@/lib/auditionListings";
import type { AuditionListing } from "@/lib/db";
import { bumpListings } from "@/lib/revalidate";

export const runtime = "nodejs";

type Body = Partial<Omit<AuditionListing, "id" | "created_at" | "updated_at">>;

// Matches caps in app/api/admin/audition-listings/route.ts. Keep in sync.
const MAX_TITLE_LEN = 200;
const MAX_DESCRIPTION_LEN = 10_000;
const MAX_REQUIREMENTS_LEN = 5_000;

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  if (!(await findListing(numericId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;

  if (
    body.role_type !== undefined &&
    !ROLE_TYPES.includes(body.role_type as never)
  ) {
    return NextResponse.json({ error: "잘못된 role_type" }, { status: 400 });
  }
  if (body.status !== undefined && !STATUSES.includes(body.status as never)) {
    return NextResponse.json({ error: "잘못된 status" }, { status: 400 });
  }
  if (body.title !== undefined) {
    const t = String(body.title).trim();
    if (!t) {
      return NextResponse.json({ error: "제목은 비울 수 없습니다." }, { status: 400 });
    }
    if (t.length > MAX_TITLE_LEN) {
      return NextResponse.json(
        { error: `제목은 ${MAX_TITLE_LEN}자 이하로 작성해주세요.` },
        { status: 400 },
      );
    }
  }
  // Same length-cap guards as the create endpoint so PATCH can't be
  // used as an escape hatch around POST validation.
  if (
    body.description !== undefined &&
    String(body.description).length > MAX_DESCRIPTION_LEN
  ) {
    return NextResponse.json(
      { error: `설명은 ${MAX_DESCRIPTION_LEN}자 이하로 작성해주세요.` },
      { status: 400 },
    );
  }
  if (
    body.requirements !== undefined &&
    String(body.requirements).length > MAX_REQUIREMENTS_LEN
  ) {
    return NextResponse.json(
      { error: `요건은 ${MAX_REQUIREMENTS_LEN}자 이하로 작성해주세요.` },
      { status: 400 },
    );
  }

  await updateListing(numericId, body);
  bumpListings();
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  if (!(await deleteListing(numericId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  bumpListings();
  return NextResponse.json({ ok: true });
}
