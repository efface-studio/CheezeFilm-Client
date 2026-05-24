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

// Defensive caps so a single admin write (or compromised admin session)
// can't blow up the row size or stuff megabytes of free text into a
// "title" field that the home page renders verbatim.
const MAX_TITLE_LEN = 200;
const MAX_DESCRIPTION_LEN = 10_000;
const MAX_REQUIREMENTS_LEN = 5_000;

export async function POST(req: Request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Body;
  const title = (body.title ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "제목은 비울 수 없습니다." }, { status: 400 });
  }
  if (title.length > MAX_TITLE_LEN) {
    return NextResponse.json(
      { error: `제목은 ${MAX_TITLE_LEN}자 이하로 작성해주세요.` },
      { status: 400 },
    );
  }
  const description = (body.description ?? "").toString();
  if (description.length > MAX_DESCRIPTION_LEN) {
    return NextResponse.json(
      { error: `설명은 ${MAX_DESCRIPTION_LEN}자 이하로 작성해주세요.` },
      { status: 400 },
    );
  }
  const requirements = (body.requirements ?? "").toString();
  if (requirements.length > MAX_REQUIREMENTS_LEN) {
    return NextResponse.json(
      { error: `요건은 ${MAX_REQUIREMENTS_LEN}자 이하로 작성해주세요.` },
      { status: 400 },
    );
  }

  const role_type = ROLE_TYPES.includes(body.role_type as never)
    ? (body.role_type as AuditionListing["role_type"])
    : "lead";
  const status = STATUSES.includes(body.status as never)
    ? (body.status as AuditionListing["status"])
    : "draft";

  const id = await createListing({
    title,
    description,
    role_type,
    requirements,
    deadline: body.deadline ? String(body.deadline) : null,
    status,
  });
  bumpListings();
  return NextResponse.json({ ok: true, id }, { status: 201 });
}
