import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  createMember,
  findMember,
  type Member,
} from "@/lib/members";

export const runtime = "nodejs";

const ACCENTS = ["purple", "yellow", "wine", "charcoal", "olive", "cream"] as const;
const ROLES = ["lead", "actor", "writer", "director"] as const;

type CreateBody = Partial<Member> & { slug?: string };

/** Generates a URL-safe slug from a Korean or English name. */
function autoSlug(input: string): string {
  // For Korean we romanize loosely with the first-letter trick; otherwise
  // just lowercase + dash. Either way we strip anything non [a-z0-9-].
  const lowered = input.trim().toLowerCase();
  const ascii = lowered
    .replace(/[가-힣]+/g, "m") // Korean char → 'm' placeholder
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (ascii && ascii !== "-") return ascii;
  // Fallback: random suffix
  return `member-${Date.now().toString(36).slice(-6)}`;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as CreateBody;

  const name = (body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 });
  }

  let slug = (body.slug ?? "").trim() || autoSlug(name);
  // Avoid collisions — bump with a numeric suffix if taken
  let attempt = slug;
  let i = 1;
  while (findMember(attempt)) {
    attempt = `${slug}-${++i}`;
  }
  slug = attempt;

  const accent = ACCENTS.includes(body.accent as typeof ACCENTS[number])
    ? (body.accent as Member["accent"])
    : "purple";
  const role = ROLES.includes(body.role as typeof ROLES[number])
    ? (body.role as Member["role"])
    : "actor";

  const member: Member = {
    slug,
    name,
    nameEn: (body.nameEn ?? "").trim(),
    role,
    roleLabel: (body.roleLabel ?? "").trim(),
    highlight: (body.highlight ?? "").trim(),
    bio: (body.bio ?? "").trim(),
    works: Array.isArray(body.works)
      ? body.works.map(String).filter((s) => s.trim().length > 0)
      : [],
    joinedNote: body.joinedNote?.toString().trim() || undefined,
    instagram: body.instagram?.toString().trim() || undefined,
    sourceUrl: body.sourceUrl?.toString().trim() || undefined,
    accent,
    uncertain: Boolean(body.uncertain),
  };

  createMember(member);
  return NextResponse.json({ ok: true, slug }, { status: 201 });
}
