import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { getSession } from "@/lib/auth";
import { getMembers } from "@/lib/members";
import { fetchInstagramProfilePic } from "@/lib/instagramFetch";

export const runtime = "nodejs";
// Could take 30+s for many handles, allow more headroom.
export const maxDuration = 120;

const MEMBERS_DIR = path.join(process.cwd(), "public", "members");
const PHOTO_EXTS = [".jpg", ".jpeg", ".png", ".webp"];
/** 저화질로 판정하는 컷오프 — 작은 인스타 아바타가 보통 8-12KB 정도라
 *  15KB 미만이면 더 큰 화질 시도해볼 가치가 있습니다. */
const LOW_QUALITY_BYTES = 15_000;

/**
 * 모든 멤버를 돌면서 인스타 프로필 사진을 자동으로 받아와 저장합니다.
 *
 *   POST /api/admin/members/fetch-photos                 → 사진 없는 멤버만
 *   POST /api/admin/members/fetch-photos?overwrite=1     → 전부 덮어쓰기
 *
 * 응답: 시도/성공/실패 카운트 + 실패한 멤버 슬러그 목록.
 *
 * Instagram 차단 가능성을 감안해 동시 요청 수를 4로 제한하고, 각 요청
 * 사이에 짧은 jitter 를 둬서 너무 공격적으로 보이지 않게 합니다.
 */

const CONCURRENCY = 4;

async function pMapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, i: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  }
  const n = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}

/** Returns existing photo's size in bytes, or -1 if none. */
async function existingPhotoSize(slug: string): Promise<number> {
  for (const ext of PHOTO_EXTS) {
    try {
      const stat = await fs.stat(path.join(MEMBERS_DIR, `${slug}${ext}`));
      return stat.size;
    } catch {
      // continue
    }
  }
  return -1;
}

async function removeOldPhotos(slug: string) {
  for (const ext of PHOTO_EXTS) {
    await fs.unlink(path.join(MEMBERS_DIR, `${slug}${ext}`)).catch(() => {});
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const overwrite = searchParams.get("overwrite") === "1";
  const retryLowQuality = searchParams.get("retryLowQuality") === "1";

  await fs.mkdir(MEMBERS_DIR, { recursive: true });

  const members = getMembers();
  // Only consider members with an Instagram handle.
  const candidates = members.filter((m) => m.instagram && m.instagram.trim());

  // Selection:
  //   · overwrite=1            → 무조건 다시 시도
  //   · retryLowQuality=1      → 기존 사진이 너무 작으면 다시 시도
  //   · 그 외                  → 사진 없는 멤버만
  const targets: typeof candidates = [];
  for (const m of candidates) {
    if (overwrite) {
      targets.push(m);
      continue;
    }
    const size = await existingPhotoSize(m.slug);
    if (size < 0) {
      targets.push(m); // 없음
    } else if (retryLowQuality && size < LOW_QUALITY_BYTES) {
      targets.push(m); // 화질 낮음
    }
  }

  const results = await pMapLimit(targets, CONCURRENCY, async (m) => {
    // Light jitter so requests don't fire in lockstep.
    await new Promise((r) => setTimeout(r, Math.random() * 400));
    const oldSize = await existingPhotoSize(m.slug);
    const pic = await fetchInstagramProfilePic(m.instagram!);
    if (!pic) {
      // overwrite means "I want fresh Instagram pics". If Instagram fails
      // for this member, the stale photo on disk is likely a YouTube
      // thumbnail from an earlier run — and worse, the same video
      // thumbnail can be reused across multiple cast members. Wipe it so
      // the row falls back to a plain initial instead of mis-attributing
      // a face to the wrong person.
      if (overwrite && oldSize >= 0) {
        await removeOldPhotos(m.slug);
        return {
          slug: m.slug,
          name: m.name,
          ok: false as const,
          cleanedUp: true,
        };
      }
      return { slug: m.slug, name: m.name, ok: false as const };
    }

    // Downgrade prevention only when NOT overwriting. When the user
    // explicitly asked for overwrite (e.g. to replace placeholder YouTube
    // thumbnails with real Instagram pics), respect that — file size
    // alone can mislead since YT thumbs are 1280×720 (~50-100KB) while
    // Instagram avatars are smaller in bytes but actually correct.
    if (!overwrite && oldSize >= 0 && pic.buffer.length <= oldSize) {
      return {
        slug: m.slug,
        name: m.name,
        ok: true as const,
        bytes: oldSize,
        ext: "kept" as const,
        kept: true,
      };
    }
    await removeOldPhotos(m.slug);
    await fs.writeFile(
      path.join(MEMBERS_DIR, `${m.slug}.${pic.ext}`),
      pic.buffer,
    );
    return {
      slug: m.slug,
      name: m.name,
      ok: true as const,
      bytes: pic.buffer.length,
      ext: pic.ext,
      kept: false,
    };
  });

  const ok = results.filter((r) => r.ok);
  const fail = results.filter((r) => !r.ok);
  const upgraded = ok.filter((r) => "kept" in r && r.kept === false).length;
  const kept = ok.filter((r) => "kept" in r && r.kept === true).length;
  const cleanedUp = fail.filter(
    (r) => "cleanedUp" in r && r.cleanedUp === true,
  ).length;

  return NextResponse.json({
    eligibleMembers: candidates.length,
    attempted: targets.length,
    skippedAsAlreadyHasPhoto: candidates.length - targets.length,
    succeeded: ok.length,
    upgraded,
    kept,
    cleanedUp,
    failed: fail.length,
    failures: fail.map((f) => ({ slug: f.slug, name: f.name })),
    overwrite,
    retryLowQuality,
  });
}

/** Dry-run preview — counts only, no network. */
export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const members = getMembers();
  const withInstagram = members.filter((m) => m.instagram && m.instagram.trim());
  let missingPhoto = 0;
  let lowQuality = 0;
  for (const m of withInstagram) {
    const size = await existingPhotoSize(m.slug);
    if (size < 0) missingPhoto++;
    else if (size < LOW_QUALITY_BYTES) lowQuality++;
  }
  return NextResponse.json({
    totalMembers: members.length,
    withInstagram: withInstagram.length,
    missingPhoto,
    lowQuality,
    haveBoth: withInstagram.length - missingPhoto - lowQuality,
  });
}
