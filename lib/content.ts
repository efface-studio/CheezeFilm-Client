/**
 * Site content registry — every editable string on the site lives here.
 *
 * Each entry has:
 *   - key:     stable identifier, used in DB rows and the admin editor
 *   - label:   human-readable label shown in the admin UI
 *   - fallback: default value, used until an admin overrides it
 *   - type:    "text" (single line) or "longtext" (multi-line)
 *   - section: groups keys in the admin editor
 *
 * Adding a new editable string:
 *   1. Add a row below
 *   2. Replace the hard-coded string in your component with
 *      `await getContent("your-key")`
 *   3. The admin's 콘텐츠 tab will pick it up automatically.
 */

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { hasSupabaseServerEnv, serverClient } from "./db";

/**
 * Cross-request cache window for the content map. Admin write endpoints
 * call `revalidateTag(CONTENT_TAG)` so edits show up immediately; in the
 * absence of an edit, public pages share this cached map for the TTL.
 */
export const CONTENT_TAG = "site_content";
const CONTENT_TTL = 300; // 5 min

export type ContentType = "text" | "longtext";

export type ContentEntry = {
  key: string;
  label: string;
  fallback: string;
  type: ContentType;
  section: string;
};

export const CONTENT_REGISTRY: ContentEntry[] = [
  // ─── HERO ─────────────────────────────────────────────────
  {
    key: "hero.tape",
    label: "히어로 상단 태그",
    fallback: "NOW SHOWING · 상영중",
    type: "text",
    section: "히어로",
  },
  {
    key: "hero.title.line1",
    label: "히어로 타이틀 1줄",
    fallback: "스토리를 굽는",
    type: "text",
    section: "히어로",
  },
  {
    key: "hero.title.line2",
    label: "히어로 타이틀 2줄 (보라색 강조)",
    fallback: "사람들.",
    type: "text",
    section: "히어로",
  },
  {
    key: "hero.subtitle",
    label: "히어로 설명문",
    fallback:
      "치즈필름은 2017년 1월 23일 첫 영상을 올린 뒤, 332만 명의 구독자와 함께 청춘의 한 컷 한 컷을 만들어온 웹드라마 스튜디오입니다. 우리는 매주, 누군가의 인생 한 장면이 될 이야기를 굽고 있습니다.",
    type: "longtext",
    section: "히어로",
  },
  {
    key: "hero.byline",
    label: "히어로 한줄 (대표 / 스튜디오)",
    fallback: "대표 김은하 · 스튜디오 치즈",
    type: "text",
    section: "히어로",
  },

  // ─── STATS ───────────────────────────────────────────────
  { key: "stats.subscribers", label: "구독자 (예: 3.32)", fallback: "3.32", type: "text", section: "통계" },
  { key: "stats.subscribers.suffix", label: "구독자 접미사", fallback: "M+", type: "text", section: "통계" },
  { key: "stats.subscribers.label", label: "구독자 레이블", fallback: "유튜브 구독자", type: "text", section: "통계" },
  { key: "stats.videos", label: "공개 영상 수", fallback: "503", type: "text", section: "통계" },
  { key: "stats.videos.suffix", label: "영상 수 접미사", fallback: "+", type: "text", section: "통계" },
  { key: "stats.videos.label", label: "영상 수 레이블", fallback: "공개된 작품", type: "text", section: "통계" },
  { key: "stats.views", label: "누적 조회수", fallback: "13.8", type: "text", section: "통계" },
  { key: "stats.views.suffix", label: "조회수 접미사", fallback: "억", type: "text", section: "통계" },
  { key: "stats.views.label", label: "조회수 레이블", fallback: "누적 조회수", type: "text", section: "통계" },
  { key: "stats.year", label: "개설 연도", fallback: "2017", type: "text", section: "통계" },
  { key: "stats.year.label", label: "개설 레이블", fallback: "스튜디오 개설", type: "text", section: "통계" },

  // ─── STORY ───────────────────────────────────────────────
  {
    key: "story.chapter",
    label: "스토리 챕터 라벨",
    fallback: "CHAPTER 01",
    type: "text",
    section: "스토리",
  },
  {
    key: "story.heading.before",
    label: "스토리 헤딩 앞부분",
    fallback: "우리 채널,",
    type: "text",
    section: "스토리",
  },
  {
    key: "story.heading.brand",
    label: "스토리 헤딩 강조어",
    fallback: "치즈필름",
    type: "text",
    section: "스토리",
  },
  {
    key: "story.heading.after",
    label: "스토리 헤딩 뒷부분",
    fallback: "이야기.",
    type: "text",
    section: "스토리",
  },
  {
    key: "story.paragraph1",
    label: "스토리 문단 1",
    fallback:
      "한 권의 만화책처럼, 한 컷씩 모인 우리의 영상은 어느새 503편이 넘었습니다. 2017년 1월 23일, 작은 카메라 한 대로 시작한 이 채널은 지금 332만 명의 구독자가 매주 찾는 작은 영화관이 되었습니다.",
    type: "longtext",
    section: "스토리",
  },
  {
    key: "story.paragraph2",
    label: "스토리 문단 2",
    fallback:
      "치즈필름은 (주)스튜디오 치즈에서 운영하는 웹드라마·광고 제작팀이며, 2021년부터 샌드박스 네트워크의 파트너로 합류해 더 많은 청춘의 이야기를 굽고 있습니다.",
    type: "longtext",
    section: "스토리",
  },

  // ─── WORKS / FILMOGRAPHY ────────────────────────────
  // For each work slot the videoId is optional — if empty, the home page
  // falls back to the latest longform video IDs pulled from the channel feed,
  // so the section always shows real thumbnails. Paste a YouTube video ID
  // (the 11-char `?v=` part of the URL) here to pin a specific film.
  // Slots 1-10 are exposed in the admin "표지 영상 (폴백)" picker; slots
  // beyond the first three are extras for richer fallback rotations when
  // there are no cover photos uploaded yet.
  ...Array.from({ length: 10 }, (_, i) => ({
    key: `works.${i + 1}.videoId`,
    label: `${i + 1}번 대표작 YouTube videoId`,
    fallback: "",
    type: "text" as const,
    section: "대표작",
  })),

  // ─── CTA ────────────────────────────────────────────────
  {
    key: "cta.heading.line1",
    label: "CTA 헤드라인 1",
    fallback: "다음 한 컷,",
    type: "text",
    section: "CTA",
  },
  {
    key: "cta.heading.line2",
    label: "CTA 헤드라인 2",
    fallback: "당신과 함께.",
    type: "text",
    section: "CTA",
  },
  {
    key: "cta.body",
    label: "CTA 본문",
    fallback:
      "오디션에 도전하거나, 응원의 한마디를 남겨주세요. 모든 메시지는 스튜디오 치즈필름의 작은 카페에서 한 번씩 꺼내 읽고 있습니다.",
    type: "longtext",
    section: "CTA",
  },

  // ─── SUPPORT PAGE ───────────────────────────────────────
  {
    key: "support.tape",
    label: "지원 페이지 태그",
    fallback: "AUDITION · 응원함",
    type: "text",
    section: "지원 페이지",
  },
  {
    key: "support.title",
    label: "지원 페이지 타이틀",
    fallback: "한 장면, 함께 굽기.",
    type: "text",
    section: "지원 페이지",
  },
  {
    key: "support.subtitle",
    label: "지원 페이지 소개문",
    fallback:
      "치즈필름의 다음 작품에 도전하거나, 좋아하는 작품에 응원의 한마디를 남겨주세요. 보내주신 내용은 모두 제작팀이 직접 읽습니다.",
    type: "longtext",
    section: "지원 페이지",
  },

  // ─── FOOTER ────────────────────────────────────────────
  {
    key: "footer.tagline",
    label: "푸터 한줄",
    fallback:
      "스토리를 굽는 사람들. \n2017년부터 이어진 우리의 작은 영화관에 오신 걸 환영합니다.",
    type: "longtext",
    section: "푸터",
  },
  {
    key: "contact.business",
    label: "비즈니스 이메일",
    fallback: "cheezefilm@sandboxnetwork.net",
    type: "text",
    section: "푸터",
  },
  {
    key: "contact.audition",
    label: "오디션 이메일",
    fallback: "cheezefilm.m@gmail.com",
    type: "text",
    section: "푸터",
  },
  {
    key: "contact.careers",
    label: "채용 이메일",
    fallback: "cheezefilm@sandboxnetwork.net",
    type: "text",
    section: "푸터",
  },
  {
    key: "footer.copyright",
    label: "푸터 저작권 표기",
    fallback: "© {year} (주)스튜디오 치즈. All rights reserved.",
    type: "text",
    section: "푸터",
  },

  // ─── COMPANY ────────────────────────────────────────────
  {
    key: "company.name",
    label: "상호",
    fallback: "(주)스튜디오 치즈",
    type: "text",
    section: "회사 정보",
  },
  {
    key: "company.name_en",
    label: "영문 상호",
    fallback: "Studio Cheeze Co., Ltd.",
    type: "text",
    section: "회사 정보",
  },
  {
    key: "company.ceo",
    label: "대표이사",
    fallback: "김은하",
    type: "text",
    section: "회사 정보",
  },
  {
    key: "company.founded",
    label: "법인 설립",
    fallback: "2020년 7월",
    type: "text",
    section: "회사 정보",
  },
  {
    key: "company.business_no",
    label: "사업자등록번호",
    fallback: "305-88-01523",
    type: "text",
    section: "회사 정보",
  },
  {
    key: "company.commerce_no",
    label: "통신판매업신고번호",
    fallback: "2024-서울강남-02085",
    type: "text",
    section: "회사 정보",
  },
  {
    key: "company.job_info_no",
    label: "직업정보 제공사업 신고번호",
    fallback: "J1200020240014",
    type: "text",
    section: "회사 정보",
  },
  {
    key: "company.address",
    label: "주소",
    fallback: "서울특별시 마포구 동교동 155-27, 효성홍익인간오피스텔 2층 270호",
    type: "longtext",
    section: "회사 정보",
  },
  {
    key: "company.phone",
    label: "고객센터",
    fallback: "070-7715-1216",
    type: "text",
    section: "회사 정보",
  },
  {
    key: "company.network",
    label: "MCN/소속",
    fallback: "샌드박스 네트워크 (2021.06~)",
    type: "text",
    section: "회사 정보",
  },
];

type ContentRow = { key: string; value: string };

/**
 * Underlying Supabase fetch — cached across requests by `unstable_cache`
 * with the `CONTENT_TAG` tag (admin invalidates on write). Returns a
 * plain object since Map/Set can't survive Next.js's cache serializer.
 */
const _fetchContentEntries = unstable_cache(
  async (): Promise<ContentRow[]> => {
    if (!hasSupabaseServerEnv()) return [];
    const sb = serverClient();
    const { data, error } = await sb.from("site_content").select("key,value");
    if (error) {
      console.error("[content.loadContentMap]", error);
      return [];
    }
    return (data ?? []) as ContentRow[];
  },
  ["content:all"],
  { tags: [CONTENT_TAG], revalidate: CONTENT_TTL },
);

/**
 * Public API. The outer `cache()` dedupes within a single request (so
 * many `await loadContentMap()` calls share one Map instance), and the
 * inner `unstable_cache` shares the underlying rows across requests.
 */
export const loadContentMap = cache(async (): Promise<Map<string, string>> => {
  const rows = await _fetchContentEntries();
  const out = new Map<string, string>();
  for (const r of rows) out.set(r.key, r.value);
  return out;
});

/**
 * Sync lookup against a previously loaded Map. Pages/components:
 *
 *   const content = await loadContentMap();
 *   const c = (key: string) => getContent(content, key);
 *
 * That pattern keeps the rest of the page synchronous — no `await` in
 * every JSX expression. Returns the registry fallback when the key is
 * unknown or the DB has no override.
 */
export function getContent(
  map: Map<string, string>,
  key: string,
): string {
  const entry = CONTENT_REGISTRY.find((e) => e.key === key);
  if (!entry) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[content] Unknown key: ${key}`);
    }
    return map.get(key) ?? "";
  }
  return map.get(key) ?? entry.fallback;
}

/**
 * Resolve every registered key. Used for batch operations (e.g. the admin
 * editor that lists every key with its current value).
 *
 * Returns both the Korean (`value`) and English (`valueEn`) variants for
 * each key. English variants are stored under `${key}.en` in the database
 * and are optional — when none has been set, `valueEn` is `""`.
 */
export async function getAllContent(): Promise<
  Array<ContentEntry & { value: string; valueEn: string }>
> {
  const overrides = await loadContentMap();
  return CONTENT_REGISTRY.map((e) => ({
    ...e,
    value: overrides.get(e.key) ?? e.fallback,
    valueEn: overrides.get(`${e.key}.en`) ?? "",
  }));
}

/**
 * Set or update a single key.
 *
 * Accepts the bare registered key for the Korean value, or `${key}.en`
 * for the English override. Anything else is rejected so we don't
 * accumulate orphaned rows.
 */
export async function setContent(key: string, value: string): Promise<void> {
  const baseKey = key.endsWith(".en") ? key.slice(0, -3) : key;
  if (!CONTENT_REGISTRY.find((e) => e.key === baseKey)) {
    throw new Error(`Unknown content key: ${key}`);
  }
  const sb = serverClient();
  const { error } = await sb
    .from("site_content")
    .upsert({ key, value }, { onConflict: "key" });
  if (error) throw error;
}

/** Reset a key back to its registry fallback (delete the override row). */
export async function resetContent(key: string): Promise<void> {
  const sb = serverClient();
  const { error } = await sb.from("site_content").delete().eq("key", key);
  if (error) throw error;
}
