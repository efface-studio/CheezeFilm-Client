import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAllVideos } from "@/lib/youtube";
import {
  createMember,
  getMembers,
  type Member,
} from "@/lib/members";
import {
  diffCastAgainstMembers,
  parseCastFromVideos,
  suggestSlug,
  type CastEntry,
} from "@/lib/castSync";

export const runtime = "nodejs";

/**
 * 영상 설명에서 캐스트를 긁어와 멤버 테이블에 자동 추가합니다.
 *
 *   GET  /api/admin/members/sync-from-videos        → dry-run preview
 *   POST /api/admin/members/sync-from-videos        → 실제로 추가
 *
 * 어느 쪽이든 응답 형태는 같습니다 (`{ added, skipped, total, plan }`).
 * GET 은 `added: []` 로 떨어지고, POST 는 실제 추가된 슬러그가 채워집니다.
 */

const ACCENTS: Member["accent"][] = [
  "purple",
  "yellow",
  "wine",
  "olive",
  "charcoal",
  "cream",
];

function inferRole(sourceKeys: string[]): {
  role: Member["role"];
  roleLabel: string;
} {
  if (sourceKeys.includes("주연")) return { role: "lead", roleLabel: "주연" };
  if (sourceKeys.includes("조연")) return { role: "actor", roleLabel: "조연" };
  return { role: "actor", roleLabel: "출연" };
}

function buildMember(
  entry: CastEntry,
  takenSlugs: Set<string>,
  i: number,
): Member {
  const slug = suggestSlug(entry.name, takenSlugs);
  takenSlugs.add(slug);
  const { role, roleLabel } = inferRole(entry.sourceKeys);
  const accent = ACCENTS[i % ACCENTS.length];
  // 작품 목록은 길어질 수 있어 상위 8편만 — 우선순위는 등장 순.
  const works = entry.appearedIn.slice(0, 8);
  const highlight =
    entry.appearedIn.length > 1
      ? `${entry.appearedIn.length}편 출연`
      : entry.appearedIn[0]
        ? "신규 출연자"
        : "";
  return {
    slug,
    name: entry.name,
    nameEn: "",
    role,
    roleLabel,
    highlight,
    bio: "",
    works,
    instagram: entry.instagram,
    accent,
    uncertain: true, // 자동 추출 → 검토 필요 표시
  };
}

async function buildPlan() {
  const { videos } = await getAllVideos();
  const cast = parseCastFromVideos(videos);
  const existing = getMembers();
  const diff = diffCastAgainstMembers(cast, existing);
  const takenSlugs = new Set(existing.map((m) => m.slug));
  const plan = diff.toAdd.map((entry, i) => buildMember(entry, takenSlugs, i));
  return { videos: videos.length, diff, plan };
}

export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { videos, diff, plan } = await buildPlan();
  return NextResponse.json({
    dryRun: true,
    videosScanned: videos,
    totalFound: diff.totalFound,
    alreadyKnownCount: diff.alreadyKnown.length,
    toAddCount: plan.length,
    plan: plan.map((m) => ({
      slug: m.slug,
      name: m.name,
      roleLabel: m.roleLabel,
      instagram: m.instagram,
      worksPreview: m.works.slice(0, 3),
      worksTotal: m.works.length,
    })),
    alreadyKnown: diff.alreadyKnown.map((k) => ({
      slug: k.slug,
      name: k.entry.name,
      appearedInCount: k.entry.appearedIn.length,
    })),
  });
}

export async function POST() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { videos, diff, plan } = await buildPlan();

  const added: string[] = [];
  const failed: Array<{ name: string; error: string }> = [];
  for (const m of plan) {
    try {
      createMember(m);
      added.push(m.slug);
    } catch (e) {
      failed.push({
        name: m.name,
        error: e instanceof Error ? e.message : "insert failed",
      });
    }
  }

  return NextResponse.json({
    dryRun: false,
    videosScanned: videos,
    totalFound: diff.totalFound,
    alreadyKnownCount: diff.alreadyKnown.length,
    added: added.length,
    failed: failed.length,
    failures: failed,
    addedSlugs: added,
  });
}
