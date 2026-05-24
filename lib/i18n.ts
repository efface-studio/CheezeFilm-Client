/**
 * Lightweight i18n for the cheezefilm site.
 *
 * Approach:
 *   - One `Lang` type, "ko" or "en". Default "ko".
 *   - User preference lives in a `cf_lang` cookie. Server components
 *     read it via `getServerLang()` (lib/i18n.server.ts). The toggle
 *     button in SiteNav writes it client-side and calls
 *     `router.refresh()`.
 *   - Two helpers for translatable strings:
 *       * `t(key, lang)` — for hardcoded UI strings (nav labels,
 *         section headings, button text). Lookup is in the
 *         `UI_STRINGS` dictionary below.
 *       * `tc(map, key, lang)` — for admin-edited content keys.
 *         When `lang === "en"`, it prefers `${key}.en` from the
 *         content map; falls back to the Korean `${key}` when no
 *         English copy was provided.
 *   - Reading cookies in a page opts the route into dynamic
 *     rendering. That's an intentional trade — the streaming
 *     Suspense work in /, /videos still keeps the perceived TTFB
 *     fast because the slow data is deferred. Only the HTML shell
 *     rebuilds per-request.
 *
 * This file is safe to import from both client and server components —
 * the cookie reading helper lives in `lib/i18n.server.ts` so this
 * module stays free of `next/headers`.
 */

export type Lang = "ko" | "en";
export const COOKIE_NAME = "cf_lang";

/**
 * UI string dictionary. Keep keys short + namespace by section
 * (nav.*, hero.*, films.*, etc.). Korean is the source of truth —
 * if an English value is missing, fall back to Korean so the page
 * never renders an empty slot.
 */
const UI_STRINGS: Record<string, { ko: string; en?: string }> = {
  // Nav
  "nav.about":     { ko: "01 소개",     en: "01 About" },
  "nav.films":     { ko: "02 영상",     en: "02 Films" },
  "nav.cast":      { ko: "03 멤버",     en: "03 Cast" },
  "nav.support":   { ko: "04 지원",     en: "04 Apply" },
  "nav.cta.audition":     { ko: "오디션 모집 중", en: "Casting now" },
  "nav.cta.staff":        { ko: "스태프 모집 중", en: "Hiring now" },
  "nav.cta.both":         { ko: "오디션·스태프 모집 중", en: "Casting & hiring" },
  "nav.cta.none":         { ko: "지원하기",       en: "Apply" },
  "nav.lang.toggle":      { ko: "EN",         en: "한국어" },

  // Hero
  "hero.badge":           { ko: "웹드라마 스튜디오", en: "Web Drama Studio" },
  "hero.cover.eyebrow":   { ko: "Now Featured · Cover", en: "Now Featured · Cover" },
  "hero.cover.title":     { ko: "이번 호의 한 컷.", en: "This issue's frame." },

  // Stats
  "stats.subscribers.label": { ko: "구독자",    en: "Subscribers" },
  "stats.videos.label":      { ko: "총 영상",   en: "Videos" },
  "stats.views.label":       { ko: "총 조회수", en: "Total views" },
  "stats.year.label":        { ko: "설립",      en: "Since" },

  // Films section
  "films.section.eyebrow": { ko: "— Section 03", en: "— Section 03" },
  "films.section.title":   { ko: "Filmography.", en: "Filmography." },
  "films.section.subtitle":{ ko: "채널을 정의한 세 편의 대표작, 그리고 매주 새로 굽고 있는 작품들까지.",
                              en: "Three flagship works that defined the channel, plus everything we're baking weekly." },
  "films.viewAll":         { ko: "전체 영상 →", en: "All films →" },
  "films.recent.eyebrow":  { ko: "— Just dropped", en: "— Just dropped" },
  "films.recent.title":    { ko: "방금 업로드된.", en: "Just dropped." },
  "films.recent.viewAll":  { ko: "전체 필모 →", en: "Full filmography →" },
  "films.new":             { ko: "NEW",            en: "NEW" },

  // Shorts
  "shorts.section.title":  { ko: "Shorts / 한 입.", en: "Shorts." },
  "shorts.viewAll":        { ko: "전체 쇼츠 →",     en: "All shorts →" },

  // Story
  "story.section.eyebrow": { ko: "— Section 01", en: "— Section 01" },
  "story.section.number":  { ko: "01", en: "01" },

  // Cast
  "cast.section.eyebrow":  { ko: "— Section 02 · Cast", en: "— Section 02 · Cast" },
  "cast.viewAll":          { ko: "멤버 전체 보기 →", en: "Meet the cast →" },

  // Careers teaser
  "careers.section.number": { ko: "04", en: "04" },
  "careers.section.cta":    { ko: "지원하기 →", en: "Apply now →" },

  // Footer / Contact
  "footer.contact.eyebrow": { ko: "— Get in touch", en: "— Get in touch" },
  "footer.copyright":       { ko: "ⓒ 치즈필름", en: "© CheezeFilm" },

  // Search / videos page
  "videos.search.label":    { ko: "Search", en: "Search" },
  "videos.search.placeholder": { ko: "제목 또는 설명으로 검색", en: "Search by title or description" },
  "videos.tab.longform":    { ko: "롱폼", en: "Long" },
  "videos.tab.shorts":      { ko: "쇼츠", en: "Shorts" },
  "videos.empty.title":     { ko: "표시할 영상이 없어요.", en: "No videos to display." },
  "videos.empty.search":    { ko: "“%s” 결과가 없어요.", en: "No results for “%s”." },
  "videos.loadMore":        { ko: "더 보기", en: "Load more" },

  // Support page
  "support.page.eyebrow":   { ko: "— Take part", en: "— Take part" },
  "support.tab.audition":   { ko: "오디션 지원", en: "Audition" },
  "support.tab.fan":        { ko: "응원 메시지", en: "Fan letter" },

  // Members page
  "members.section.eyebrow":{ ko: "— Cast & Crew", en: "— Cast & Crew" },
  "members.page.title":     { ko: "스토리를 굽는 사람들.", en: "The people behind the stories." },

  // Loading
  "loading.title":          { ko: "굽는 중", en: "Baking" },
  "loading.subtitle":       { ko: "잠시만 기다려주세요", en: "One moment, please" },
};

/** Look up a UI string by key for the given lang. */
export function t(key: string, lang: Lang): string {
  const entry = UI_STRINGS[key];
  if (!entry) {
    // Helpful in dev — visible in production but unlikely once translations stabilize.
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[i18n] missing UI string: ${key}`);
    }
    return key;
  }
  if (lang === "en" && entry.en) return entry.en;
  return entry.ko;
}

/**
 * Look up an admin-edited content key with English fallback.
 *
 * Conventions:
 *   - Korean values live under the plain key (e.g. `hero.title.line1`).
 *   - English overrides live under `${key}.en` (e.g.
 *     `hero.title.line1.en`). The admin content editor surfaces both
 *     fields so editors can fill in either or both.
 *   - When lang === "en", we prefer the `.en` variant; if missing,
 *     fall back to the Korean value (so the page never renders empty).
 */
export function tc(
  contentMap: Map<string, string>,
  key: string,
  lang: Lang,
): string {
  if (lang === "en") {
    const en = contentMap.get(`${key}.en`);
    if (en && en.trim()) return en;
  }
  return contentMap.get(key) ?? "";
}
