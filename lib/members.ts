/**
 * 치즈필름 멤버 데이터 — SQLite-backed.
 *
 * Rows live in the `members` table; this module just provides typed
 * accessors and the seed data used on first boot of an empty DB.
 *
 * Photo handling unchanged:
 *   - public/members/<slug>.{jpg,png,webp} → served via <MemberPolaroid>
 *   - no file → colored polaroid fallback with the first character
 */

import { db } from "./db";

export type MemberRole = "lead" | "actor" | "writer" | "director";

export type Member = {
  slug: string;
  name: string;
  nameEn: string;
  role: MemberRole;
  roleLabel: string;
  highlight: string;
  bio: string;
  works: string[];
  joinedNote?: string;
  instagram?: string;
  sourceUrl?: string;
  accent: "purple" | "yellow" | "wine" | "charcoal" | "olive" | "cream";
  uncertain?: boolean;
};

// ─── seed (used only when the table is empty) ──────────
export const SEED_MEMBERS: Member[] = [
  {
    slug: "kim-eunha",
    name: "김은하",
    nameEn: "Kim Eun-ha",
    role: "director",
    roleLabel: "대표 · CEO",
    highlight: "스튜디오 치즈를 키운 사람",
    bio: "치즈필름 채널 전반과 (주)스튜디오 치즈 운영을 총괄. 300만+ 구독 웹드라마 채널의 방향성을 잡는 키플레이어입니다.",
    works: ["치즈필름 채널 전반", "다중인격 소녀", "남자무리 여사친"],
    joinedNote: "현 대표",
    instagram: "cheezefilm.ceo",
    sourceUrl: "https://ko.wikipedia.org/wiki/%EC%B9%98%EC%A6%88%ED%95%84%EB%A6%84",
    accent: "purple",
  },
  {
    slug: "eunseong",
    name: "은성",
    nameEn: "Eun-sung",
    role: "writer",
    roleLabel: "작가 · 총괄",
    highlight: "톤앤매너를 정립한 작가",
    bio: "동아리에서 시작한 치즈필름을 정식 제작사로 키운 핵심 인물. 작가진 4명을 진두지휘하며 채널의 색을 만들었습니다.",
    works: ["치즈필름 단편 시리즈 기획·집필 총괄"],
    joinedNote: "2018.12 합류",
    sourceUrl: "https://www.wikitree.co.kr/articles/574343",
    accent: "charcoal",
  },
  {
    slug: "park-seoyoung",
    name: "박서영",
    nameEn: "Park Seo-young",
    role: "lead",
    roleLabel: "배우 · 간판",
    highlight: "치즈필름 다작여왕",
    bio: "2018년 필름메이커스 오디션으로 합류해 시원시원하고 털털한 캐릭터로 채널 초창기부터 자리잡은 간판 배우.",
    works: ["달빛여고 MYC단", "학생 연애 — 여사친이 여자로 보일 때", "베이스먼트"],
    joinedNote: "2018 합류",
    sourceUrl: "https://www.wikitree.co.kr/articles/575915",
    accent: "wine",
  },
  {
    slug: "park-seyoung",
    name: "박세영",
    nameEn: "Park Se-young",
    role: "actor",
    roleLabel: "배우 · 모델",
    highlight: "모델 출신 멀티 플레이어",
    bio: "서울패션위크 촬영 중 조연출에게 스카우트되어 합류. 한 분야에 갇히지 않고 모델·배우 양쪽에서 활동합니다.",
    works: ["여동생이 오빠 연애를 코치한다", "웰컴 투 하와이"],
    joinedNote: "2019 합류",
    instagram: "syeeep_",
    sourceUrl: "https://www.wikitree.co.kr/articles/578212",
    accent: "olive",
  },
  {
    slug: "choi-eunji",
    name: "최은지",
    nameEn: "Choi Eun-ji",
    role: "lead",
    roleLabel: "배우",
    highlight: "회사원에서 늦깎이 배우로",
    bio: "건축회사 4년차 도면 작업자에서 2019년 오디션을 통해 배우로 전향. 유튜브 채널 '좋은지'도 운영합니다.",
    works: ["다중인격 소녀 — 아영", "나를 따라다니는 친구 특징", "여우로 오해 받는 친구 특징"],
    joinedNote: "2019.05 데뷔",
    instagram: "c_ej9236",
    sourceUrl: "https://www.wikitree.co.kr/articles/521926",
    accent: "purple",
  },
  {
    slug: "kim-gihae",
    name: "김기해",
    nameEn: "Kim Gi-hae",
    role: "actor",
    roleLabel: "배우",
    highlight: "본인만 모르는 잘생김",
    bio: "경희대 연극영화과 재학 중 합류. 큰 키에 잘생긴 외모인데 정작 본인은 모르는 캐릭터로 주목받았습니다.",
    works: ["남자무리 여사친", "달고나 — 진혁", "홍디션"],
    joinedNote: "2020.03 합류",
    sourceUrl: "https://www.wikitree.co.kr/articles/571590",
    accent: "charcoal",
  },
  {
    slug: "jo-chaeyun",
    name: "조채윤",
    nameEn: "Jo Chae-yun",
    role: "lead",
    roleLabel: "배우",
    highlight: "사투리·다인격 연기로 팬덤 형성",
    bio: "초기 활동명 '조아영'. 《다중인격 소녀》에서 사투리와 4가지 인격 변신 연기로 채널 팬덤을 만든 시리즈 주연.",
    works: ["다중인격 소녀 (시리즈 주연)"],
    joinedNote: "1999년생",
    instagram: "with_yun0515",
    accent: "wine",
    uncertain: true,
  },
  {
    slug: "jo-hyomin",
    name: "조효민",
    nameEn: "Jo Hyo-min",
    role: "actor",
    roleLabel: "배우 · 모델",
    highlight: "“치즈필름 효민”",
    bio: "단편선/공감 계열에 자주 출연하며 채널 내 인지도를 다진 배우. 외부 예능(꼰대희 ‘밥묵자’) 출연도 활발합니다.",
    works: ["치즈필름 단편선 다수", "꼰대희 — 밥묵자"],
    instagram: "hy0minim",
    accent: "olive",
  },
];

// ─── row ↔ object mapping ──────────────────────────────
type Row = {
  slug: string;
  name: string;
  name_en: string;
  role: MemberRole;
  role_label: string;
  highlight: string;
  bio: string;
  works: string; // JSON
  joined_note: string | null;
  instagram: string | null;
  source_url: string | null;
  accent: Member["accent"];
  uncertain: number; // 0|1
  sort_order: number;
};

function rowToMember(r: Row): Member {
  return {
    slug: r.slug,
    name: r.name,
    nameEn: r.name_en,
    role: r.role,
    roleLabel: r.role_label,
    highlight: r.highlight,
    bio: r.bio,
    works: safeParseWorks(r.works),
    joinedNote: r.joined_note ?? undefined,
    instagram: r.instagram ?? undefined,
    sourceUrl: r.source_url ?? undefined,
    accent: r.accent,
    uncertain: r.uncertain === 1 ? true : undefined,
  };
}

function safeParseWorks(s: string): string[] {
  try {
    const parsed = JSON.parse(s);
    return Array.isArray(parsed) ? parsed.filter((w) => typeof w === "string") : [];
  } catch {
    return [];
  }
}

// ─── lazy seed on first read ───────────────────────────
let seeded = false;
function ensureSeeded() {
  if (seeded) return;
  const count = db
    .prepare("SELECT COUNT(*) as c FROM members")
    .get() as { c: number };
  if (count.c === 0) {
    const insert = db.prepare(`
      INSERT INTO members
        (slug, name, name_en, role, role_label, highlight, bio, works,
         joined_note, instagram, source_url, accent, uncertain, sort_order)
      VALUES
        (@slug, @name, @name_en, @role, @role_label, @highlight, @bio, @works,
         @joined_note, @instagram, @source_url, @accent, @uncertain, @sort_order)
    `);
    const tx = db.transaction((rows: Member[]) => {
      rows.forEach((m, i) => {
        insert.run({
          slug: m.slug,
          name: m.name,
          name_en: m.nameEn,
          role: m.role,
          role_label: m.roleLabel,
          highlight: m.highlight,
          bio: m.bio,
          works: JSON.stringify(m.works),
          joined_note: m.joinedNote ?? null,
          instagram: m.instagram ?? null,
          source_url: m.sourceUrl ?? null,
          accent: m.accent,
          uncertain: m.uncertain ? 1 : 0,
          sort_order: i,
        });
      });
    });
    tx(SEED_MEMBERS);
  }
  seeded = true;
}

// ─── public API (drop-in replacement for the old constant) ──
export function getMembers(): Member[] {
  ensureSeeded();
  const rows = db
    .prepare("SELECT * FROM members ORDER BY sort_order ASC, slug ASC")
    .all() as Row[];
  return rows.map(rowToMember);
}

export function findMember(slug: string): Member | undefined {
  ensureSeeded();
  const row = db
    .prepare("SELECT * FROM members WHERE slug = ?")
    .get(slug) as Row | undefined;
  return row ? rowToMember(row) : undefined;
}

/** Back-compat — pages that imported `members` get a fresh list on each request. */
export const members = new Proxy([] as Member[], {
  get(_t, prop) {
    const list = getMembers();
    const value = Reflect.get(list, prop);
    return typeof value === "function" ? value.bind(list) : value;
  },
});

// ─── mutations (admin only — call sites must enforce auth) ──
export function createMember(input: Member) {
  ensureSeeded();
  const maxOrder = db
    .prepare("SELECT COALESCE(MAX(sort_order), -1) as m FROM members")
    .get() as { m: number };
  db.prepare(`
    INSERT INTO members
      (slug, name, name_en, role, role_label, highlight, bio, works,
       joined_note, instagram, source_url, accent, uncertain, sort_order)
    VALUES
      (@slug, @name, @name_en, @role, @role_label, @highlight, @bio, @works,
       @joined_note, @instagram, @source_url, @accent, @uncertain, @sort_order)
  `).run({
    slug: input.slug,
    name: input.name,
    name_en: input.nameEn,
    role: input.role,
    role_label: input.roleLabel,
    highlight: input.highlight,
    bio: input.bio,
    works: JSON.stringify(input.works),
    joined_note: input.joinedNote ?? null,
    instagram: input.instagram ?? null,
    source_url: input.sourceUrl ?? null,
    accent: input.accent,
    uncertain: input.uncertain ? 1 : 0,
    sort_order: maxOrder.m + 1,
  });
}

export function updateMember(slug: string, patch: Partial<Omit<Member, "slug">>) {
  ensureSeeded();
  // Build a dynamic SET clause — only update fields actually present in `patch`.
  const fields: string[] = [];
  const params: Record<string, unknown> = { slug };
  const map: Record<string, [string, (v: unknown) => unknown]> = {
    name: ["name", (v) => v],
    nameEn: ["name_en", (v) => v],
    role: ["role", (v) => v],
    roleLabel: ["role_label", (v) => v],
    highlight: ["highlight", (v) => v],
    bio: ["bio", (v) => v],
    works: ["works", (v) => JSON.stringify(v ?? [])],
    joinedNote: ["joined_note", (v) => (v ? v : null)],
    instagram: ["instagram", (v) => (v ? v : null)],
    sourceUrl: ["source_url", (v) => (v ? v : null)],
    accent: ["accent", (v) => v],
    uncertain: ["uncertain", (v) => (v ? 1 : 0)],
  };
  for (const [k, v] of Object.entries(patch)) {
    const entry = map[k];
    if (!entry) continue;
    const [col, fn] = entry;
    fields.push(`${col} = @${col}`);
    params[col] = fn(v);
  }
  if (fields.length === 0) return;
  db.prepare(`UPDATE members SET ${fields.join(", ")} WHERE slug = @slug`).run(params);
}

export function deleteMember(slug: string) {
  ensureSeeded();
  db.prepare("DELETE FROM members WHERE slug = ?").run(slug);
}

export function getRoleColorClass(accent: Member["accent"]) {
  switch (accent) {
    case "purple":
      return "bg-cheeze-purple text-cheeze-yellow";
    case "yellow":
      return "bg-cheeze-yellow text-cheeze-purple-deep";
    case "wine":
      return "bg-cheeze-wine text-cheeze-cream";
    case "charcoal":
      return "bg-cheeze-charcoal text-cheeze-yellow";
    case "olive":
      return "bg-cheeze-olive text-cheeze-cream";
    case "cream":
      return "bg-cheeze-cream-deep text-cheeze-purple-deep";
  }
}
