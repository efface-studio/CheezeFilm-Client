import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getMembers, updateMember, type Member } from "@/lib/members";
import { serverClient } from "@/lib/db";
import { fetchInstagramProfilePic } from "@/lib/instagramFetch";

export const runtime = "nodejs";
// Could take 30+s for many handles, allow more headroom.
export const maxDuration = 120;

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

function safeKey(slug: string, ext: string): string {
  const safe = /^[a-zA-Z0-9._-]+$/.test(slug)
    ? slug
    : `m-${crypto.createHash("sha1").update(slug).digest("hex").slice(0, 16)}`;
  return `${safe}.${ext}`;
}

async function pMapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, i: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

async function existingPhotoSize(m: Member): Promise<number> {
  if (!m.photoPath) return -1;
  const sb = serverClient();
  const { data } = await sb.storage.from("members").download(m.photoPath);
  if (!data) return -1;
  return data.size;
}

async function removeOldPhoto(m: Member) {
  if (!m.photoPath) return;
  const sb = serverClient();
  await sb.storage.from("members").remove([m.photoPath]);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const overwrite = searchParams.get("overwrite") === "1";
  const retryLowQuality = searchParams.get("retryLowQuality") === "1";

  const members = await getMembers();
  const candidates = members.filter((m) => m.instagram && m.instagram.trim());

  // Selection
  const targets: Member[] = [];
  for (const m of candidates) {
    if (overwrite) {
      targets.push(m);
      continue;
    }
    const size = await existingPhotoSize(m);
    if (size < 0) {
      targets.push(m);
    } else if (retryLowQuality && size < LOW_QUALITY_BYTES) {
      targets.push(m);
    }
  }

  const sb = serverClient();
  const results = await pMapLimit(targets, CONCURRENCY, async (m) => {
    await new Promise((r) => setTimeout(r, Math.random() * 400));
    const oldSize = await existingPhotoSize(m);
    const pic = await fetchInstagramProfilePic(m.instagram!);
    if (!pic) {
      if (overwrite && oldSize >= 0) {
        await removeOldPhoto(m);
        await updateMember(m.slug, { photoPath: undefined });
        return {
          slug: m.slug,
          name: m.name,
          ok: false as const,
          cleanedUp: true,
        };
      }
      return { slug: m.slug, name: m.name, ok: false as const };
    }
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
    await removeOldPhoto(m);
    const key = safeKey(m.slug, pic.ext);
    const contentType =
      pic.ext === "png"
        ? "image/png"
        : pic.ext === "webp"
          ? "image/webp"
          : "image/jpeg";
    const { error } = await sb.storage
      .from("members")
      .upload(key, pic.buffer, { contentType, upsert: true });
    if (error) {
      return { slug: m.slug, name: m.name, ok: false as const };
    }
    await updateMember(m.slug, { photoPath: key });
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

  const members = await getMembers();
  const withInstagram = members.filter((m) => m.instagram && m.instagram.trim());
  let missingPhoto = 0;
  let lowQuality = 0;
  for (const m of withInstagram) {
    const size = await existingPhotoSize(m);
    if (size < 0) missingPhoto++;
    else if (size < LOW_QUALITY_BYTES) lowQuality++;
  }
  return NextResponse.json({
    totalMembers: members.length,
    withInstagram: withInstagram.length,
    missingPhoto,
    lowQuality,
  });
}
