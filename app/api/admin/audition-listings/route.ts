import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  createListing,
  ROLE_TYPES,
  STATUSES,
} from "@/lib/auditionListings";
import type { AuditionListing } from "@/lib/db";
import { bumpListings } from "@/lib/revalidate";

export const runtime = "nodejs";

type Body = Partial<Omit<AuditionListing, "id" | "created_at" | "updated_at">>;

export async function POST(req: Request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Body;
  const title = (body.title ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "제목은 비울 수 없습니다." }, { status: 400 });
  }

  const role_type = ROLE_TYPES.includes(body.role_type as never)
    ? (body.role_type as AuditionListing["role_type"])
    : "lead";
  const status = STATUSES.includes(body.status as never)
    ? (body.status as AuditionListing["status"])
    : "draft";

  const id = await createListing({
    title,
    description: (body.description ?? "").toString(),
    role_type,
    requirements: (body.requirements ?? "").toString(),
    deadline: body.deadline ? String(body.deadline) : null,
    status,
  });
  bumpListings();
  return NextResponse.json({ ok: true, id }, { status: 201 });
}
