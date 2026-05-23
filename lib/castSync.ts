/**
 * 영상 설명에서 출연자 정보를 추출해 멤버 명단과 대조합니다.
 *
 *   videos[*].description ─┐
 *                          ├─► parseCastFromVideos() ─► CastEntry[]
 *                          │       (name, instagram?, appearedIn[])
 *                          │
 *   getMembers()  ─────────┴─► diffCastAgainstMembers() ─► CastDiff
 *                                  · new      : 멤버에 없는 사람
 *                                  · existing : 이미 등록된 사람 (스킵)
 *
 * **치즈필름 설명 포맷 (관찰):**
 *
 *     하영님 - https://www.instagram.com/youj.ng/
 *     유라님 - https://www.instagram.com/yura_rarra/
 *
 * 즉 콜론 라벨이 아니라 "이름님 - 인스타 URL" 줄들이 늘어선 형태입니다.
 * 그래서 메인 추출은 이 라인 패턴을 기반으로 합니다.
 *
 * 추가로 혹시 들어있을 수 있는 `출연: 이름1, 이름2` 식 콜론 라벨도 같이
 * 받아들이도록 후방 호환을 유지합니다.
 *
 * 직책 토큰(`작가 / 감독 / PD …`)은 사람 이름이 아니므로 제외 — 멤버
 * 명단의 진짜 신원은 운영자가 직접 매핑해야 안전합니다.
 */

import type { Video } from "./youtube";

const CAST_KEYS = ["출연", "주연", "조연", "CAST", "cast"] as const;
const CREDIT_LINE = /^([^:\s]{1,8})\s*[:：]\s*(.+)$/;
const NAME_HAS_LETTERS = /[가-힣A-Za-z]/;

/**
 * 메인 패턴: `이름님 - https://www.instagram.com/handle/`
 * - 라인 단위로만 매칭 (`m` flag + `^`) — 직전 URL 끝이 이름으로 빨려
 *   들어가던 노이즈("ISOlOgVE하영" 같은 케이스) 차단.
 * - 이름은 **순수 한글 1~8자** 또는 **순수 영문 1~16자**. 혼합 금지.
 * - 하이픈은 ASCII `-`, en-dash `–`, em-dash `—` 모두 허용.
 */
const NAME_INSTA_LINE =
  /^\s*([가-힣]{1,8}|[A-Za-z][A-Za-z .]{0,15}[A-Za-z])님\s*[-–—]\s*https?:\/\/(?:www\.)?instagram\.com\/([A-Za-z0-9._-]+)\/?/gm;

/** 직책/역할 토큰들 — 이름 자리에 들어와도 사람으로 인정하지 않음. */
const ROLE_WORDS = new Set([
  "작가", "감독", "연출", "PD", "피디", "촬영", "편집", "음악",
  "스태프", "조연출", "기획", "스타일", "스타일리스트", "기자",
  "배우",
]);

/** 영상 1편에서 뽑아낸 한 명의 출연자 정보 — 원본 토큰 보존. */
export type ExtractedPerson = {
  /** 정규화된 이름. */
  name: string;
  /** 발견된 인스타그램 핸들 (있으면). */
  instagram?: string;
  /** 어떤 키(`출연` / `주연` …) 라인에서 나왔는지. */
  source: string;
};

/** 동일 인물 단위로 묶인 결과 — 작품 목록 + 인스타 핸들이 누적됩니다. */
export type CastEntry = {
  name: string;
  /** 가장 자주 발견된 핸들 1개. */
  instagram?: string;
  /** 출연한 영상 제목들 (중복 제거, 등장 순). */
  appearedIn: string[];
  /** 어떤 키워드로 등장했는지 모음. */
  sourceKeys: string[];
};

export type CastDiff = {
  /** 멤버 DB에 없는 새 출연자. */
  toAdd: CastEntry[];
  /** 이미 등록된 멤버 (이름 일치). */
  alreadyKnown: Array<{
    slug: string;
    entry: CastEntry;
  }>;
  /** 영상 설명에서 발견된 총 인원 수 (중복 제거 후). */
  totalFound: number;
};

/** 멤버 매칭에 쓸 키. 공백·점·하이픈을 무시한 lower. */
function normalizeKey(s: string): string {
  return s.replace(/[\s·.\-_]/g, "").toLowerCase();
}

/** 출연 키 라인의 값에서 사람 토큰들을 뽑습니다. */
function splitNames(value: string): { raw: string; clean: string; ig?: string }[] {
  const tokens = value
    .split(/[,/·、|\n\r]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return tokens
    .map((raw) => {
      const igMatch = raw.match(/[@＠]([A-Za-z0-9._-]{2,32})/);
      const ig = igMatch?.[1];
      const clean = raw
        .replace(/[@＠][A-Za-z0-9._-]+/g, "")
        .replace(/\([^)]*\)/g, "")
        .replace(/\[[^\]]*\]/g, "")
        .replace(/https?:\/\/\S+/g, "")
        .replace(/\s+/g, " ")
        .trim();
      return { raw, clean, ig };
    })
    .filter(
      (t) =>
        t.clean.length >= 2 &&
        t.clean.length <= 30 &&
        NAME_HAS_LETTERS.test(t.clean),
    );
}

type Accumulator = CastEntry & { _igCounts: Map<string, number> };

function recordHit(
  byKey: Map<string, Accumulator>,
  name: string,
  videoTitle: string,
  sourceKey: string,
  instagram?: string,
) {
  if (ROLE_WORDS.has(name)) return; // 직책 → skip
  const k = normalizeKey(name);
  if (!k) return;
  let entry = byKey.get(k);
  if (!entry) {
    entry = {
      name,
      instagram,
      appearedIn: [],
      sourceKeys: [],
      _igCounts: new Map(),
    };
    byKey.set(k, entry);
  }
  if (instagram) {
    entry._igCounts.set(instagram, (entry._igCounts.get(instagram) ?? 0) + 1);
  }
  if (!entry.appearedIn.includes(videoTitle)) {
    entry.appearedIn.push(videoTitle);
  }
  if (!entry.sourceKeys.includes(sourceKey)) {
    entry.sourceKeys.push(sourceKey);
  }
}

/**
 * 영상들에서 출연자 토큰을 전부 뽑아 한 사람당 한 항목으로 합칩니다.
 * 두 가지 패턴을 같이 봅니다:
 *   1) `이름님 - https://www.instagram.com/handle/`  (치즈필름 표준)
 *   2) `출연: 이름1, 이름2`                          (콜론 라벨 후방 호환)
 */
export function parseCastFromVideos(videos: Video[]): CastEntry[] {
  const byKey = new Map<string, Accumulator>();

  for (const v of videos) {
    if (!v.description) continue;

    // ── Pattern 1: "이름님 - instagram URL" (라인/문장 단위 어디에서나)
    for (const m of v.description.matchAll(NAME_INSTA_LINE)) {
      const name = m[1].trim().replace(/\s+/g, "");
      const handle = m[2];
      recordHit(byKey, name, v.title, "출연", handle);
    }

    // ── Pattern 2: "출연: 이름1, 이름2" (콜론 라벨)
    for (const rawLine of v.description.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line) continue;
      const m = CREDIT_LINE.exec(line);
      if (!m) continue;
      const key = m[1].trim();
      if (!(CAST_KEYS as readonly string[]).includes(key)) continue;
      const tokens = splitNames(m[2]);
      for (const t of tokens) {
        recordHit(byKey, t.clean, v.title, key, t.ig);
      }
    }
  }

  // Resolve instagram by frequency.
  return Array.from(byKey.values()).map((e) => {
    let topIg: string | undefined;
    let topCount = 0;
    for (const [handle, count] of e._igCounts) {
      if (count > topCount) {
        topIg = handle;
        topCount = count;
      }
    }
    return {
      name: e.name,
      instagram: topIg,
      appearedIn: e.appearedIn,
      sourceKeys: e.sourceKeys,
    };
  });
}

/**
 * 추출된 출연자들을 기존 멤버 목록과 대조해 신규/기존을 분리합니다.
 * 매칭은 이름 정규화 키와 영문 이름 정규화 키 둘 다로 시도합니다.
 */
export function diffCastAgainstMembers(
  cast: CastEntry[],
  existingMembers: Array<{ slug: string; name: string; nameEn?: string }>,
): CastDiff {
  const memberByKey = new Map<string, { slug: string; name: string }>();
  for (const m of existingMembers) {
    memberByKey.set(normalizeKey(m.name), { slug: m.slug, name: m.name });
    if (m.nameEn) {
      memberByKey.set(normalizeKey(m.nameEn), { slug: m.slug, name: m.name });
    }
  }

  const toAdd: CastEntry[] = [];
  const alreadyKnown: CastDiff["alreadyKnown"] = [];
  for (const entry of cast) {
    const match = memberByKey.get(normalizeKey(entry.name));
    if (match) {
      alreadyKnown.push({ slug: match.slug, entry });
    } else {
      toAdd.push(entry);
    }
  }

  return {
    toAdd,
    alreadyKnown,
    totalFound: cast.length,
  };
}

/**
 * 한국어 이름을 슬러그로. 슬러그가 비거나 충돌하면 카운터를 붙입니다.
 *   "김유연"          → "kim-yuyeon" (...있다면) 또는 "cast-김유연"
 * 실제로는 멤버 테이블이 임의 슬러그를 허용하므로, 가장 깨끗한 방법은
 * 한글 그대로 + 충돌 시 -2, -3 접미사를 붙이는 것입니다.
 */
export function suggestSlug(name: string, takenSlugs: Set<string>): string {
  const base = name.replace(/\s+/g, "-").replace(/[^\p{L}\p{N}\-_]/gu, "");
  if (!base) {
    let i = 1;
    while (takenSlugs.has(`cast-${i}`)) i++;
    return `cast-${i}`;
  }
  if (!takenSlugs.has(base)) return base;
  let i = 2;
  while (takenSlugs.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}
