/**
 * Lightweight i18n for the cheezefilm site.
 *
 * Approach:
 *   - One `Lang` type, "ko" or "en". Default "ko".
 *   - User preference lives in a `cf_lang` cookie. Server components
 *     read it via `getServerLang()` (lib/i18n.server.ts). The toggle
 *     button in SiteNav writes it client-side and calls
 *     `router.refresh()`.
 *   - `t(key, lang)` — for hardcoded UI strings (nav labels, section
 *     headings, button text). Lookup is in the `UI_STRINGS` dictionary
 *     below.
 *   - For admin-edited content keys, use `getContent(map, key, lang)`
 *     from `lib/content.ts` instead. It carries the same English-fallback
 *     contract: when `lang === "en"` it prefers `${key}.en` and falls
 *     back to the Korean `${key}` if no English copy exists.
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
  "hero.cover.alt":       { ko: "치즈필름 표지", en: "CheezeFilm cover" },

  // Awards strip
  "awards.platinum":      { ko: "플래티넘", en: "Platinum" },
  "awards.gold":           { ko: "골드", en: "Gold" },
  "awards.silver":        { ko: "실버", en: "Silver" },
  "awards.grand":         { ko: "대상", en: "Grand Prize" },

  // Home > Cast section
  "cast.section.title":   { ko: "함께 한 컷을 굽는 사람들.", en: "The people behind every frame." },
  "cast.section.subtitle":{ ko: "치즈필름의 카메라 앞과 뒤. 배우·작가·연출의 명단.", en: "On both sides of the CheezeFilm camera — cast, writers, and directors." },

  // Home > Featured roles teaser
  "roles.eyebrow":        { ko: "— Featured roles", en: "— Featured roles" },
  "roles.lead":           { ko: "주연배우", en: "Lead actor" },
  "roles.intro":          { ko: "를 비롯해,\n함께 한 컷을 구울 사람.", en: ", plus everyone who'll bake the next frame with us." },
  "roles.copy":           { ko: "치즈필름 신작의 얼굴이 될 배우를 1순위로, 작가·연출·촬영·편집까지 결을 맞춰 오래 함께할 사람을 찾고 있습니다.", en: "We're casting the next lead — and the writers, directors, DPs, and editors who'll grow with us long-term." },

  "role1.title":          { ko: "배우 (주연/조연)", en: "Actor (lead/supporting)" },
  "role1.desc":           { ko: "신작의 얼굴. 10~30분 단편 안에서 인물을 진짜처럼 살려낼 분.", en: "The face of our next film. Someone who can make a character feel real in a 10–30 min short." },
  "role2.title":          { ko: "작가", en: "Writer" },
  "role2.desc":           { ko: "매주 한 편씩 단편을 굽는 작가. 청춘 드라마 톤을 이해하는 분.", en: "A writer who bakes a new short every week and understands the tone of teen/youth drama." },
  "role3.title":          { ko: "연출", en: "Director" },
  "role3.desc":           { ko: "한 회차 안에서 인물의 작은 변화를 카메라로 잡아내는 분.", en: "A director who can capture the smallest shifts in character within a single episode." },
  "role4.title":          { ko: "촬영 · 편집", en: "Cinematography · Editing" },
  "role4.desc":           { ko: "빛·구도·컷 — 한 컷의 결을 책임지는 사람.", en: "Light, framing, and cut — the people responsible for the grain of every frame." },

  // Featured films (home)
  "film1.title":          { ko: "다중인격 소녀", en: "The Multiple Personality Girl" },
  "film1.tagline":        { ko: "사투리, 그리고 네 개의 인격.", en: "Four personalities, one dialect." },
  "film2.title":          { ko: "남자무리 여사친", en: "One Girl, All Boys" },
  "film2.tagline":        { ko: "남자들 사이의 단 한 명, 여사친.", en: "The only girl in the boys' group." },
  "film3.title":          { ko: "달고나", en: "Dalgona" },
  "film3.tagline":        { ko: "달콤하고, 한 번에 깨지는 청춘.", en: "Sweet youth, broken in a single beat." },

  // Films section meta
  "films.featured.eyebrow": { ko: "— Featured", en: "— Featured" },
  "films.year.series":    { ko: "Series", en: "Series" },
  "films.year.anthology": { ko: "2020 · Anthology", en: "2020 · Anthology" },
  "films.year.fourpart":  { ko: "2020 · 4-part", en: "2020 · 4-part" },
  "films.read":           { ko: "Read more →", en: "Read more →" },

  // Careers reel
  "careers.reel.label":   { ko: "치즈필름 주연배우 공개 오디션 릴스", en: "CheezeFilm lead-cast open audition reel" },
  "careers.reel.caption": { ko: "치즈필름과 함께 2026년을 만들어갈 주인공을 기다립니다.", en: "We're looking for the lead who'll shape 2026 with CheezeFilm." },
  "careers.cta.primary":  { ko: "지원하기 →", en: "Apply now →" },
  "careers.full.cta":     { ko: "전체 채용 페이지 →", en: "Full careers page →" },

  // Company info row labels
  "company.label.name":   { ko: "상호", en: "Company" },
  "company.label.ceo":    { ko: "대표", en: "CEO" },
  "company.label.business_no": { ko: "사업자등록번호", en: "Business reg." },
  "company.label.commerce_no": { ko: "통신판매업신고", en: "Mail-order reg." },
  "company.label.job_info_no": { ko: "직업정보제공사업", en: "Job info reg." },
  "company.label.address":{ ko: "주소", en: "Address" },
  "company.label.phone":  { ko: "고객센터", en: "Phone" },

  // Aria labels
  "aria.youtube":         { ko: "YouTube — 새 탭에서 열기", en: "YouTube — open in new tab" },
  "aria.instagram":       { ko: "Instagram — 새 탭에서 열기", en: "Instagram — open in new tab" },

  // Members page
  "members.page.meta.title": { ko: "캐스트 · The Cast", en: "Cast · The Cast" },
  "members.page.meta.desc": { ko: "치즈필름의 카메라 앞과 뒤, 함께 한 컷을 굽는 사람들. 배우·작가·연출의 명단을 한 페이지에서.", en: "Everyone in front of and behind the CheezeFilm camera — cast, writers, and directors in one place." },
  "members.notfound":     { ko: "멤버를 찾을 수 없어요", en: "Member not found" },

  // Careers page
  "careers.meta.title":   { ko: "채용 · Careers", en: "Careers" },
  "careers.meta.desc":    { ko: "스튜디오 치즈는 매주 한 컷을 굽는 사람들과 함께합니다. 작가·연출·촬영·편집·운영, 결을 맞춰 일할 동료를 찾아요.", en: "Studio Cheeze works with people who bake a new frame every week. Writers, directors, DPs, editors, and producers — looking for teammates in step with us." },
  "careers.hero.eyebrow": { ko: "— Cheeze Studio", en: "— Cheeze Studio" },
  "careers.hero.title.before": { ko: "다음 한 컷,", en: "The next frame," },
  "careers.hero.title.highlight": { ko: "구울 사람.", en: "the people to bake it." },
  "careers.hero.subtitle":{ ko: "스튜디오 치즈는 매주 한 컷을 굽는 사람들과 함께하고 있어요.", en: "Studio Cheeze works with people baking a new frame every single week." },
  "careers.hero.priority":{ ko: "배우", en: "Actor" },
  "careers.hero.priority.suffix": { ko: "를 1순위로, 작가·연출·촬영·편집·운영까지 결을 맞춰 일할 동료를 찾고 있습니다.", en: " is our top priority — alongside writers, directors, DPs, editors, and producers we can grow with." },
  "careers.stat.actor":   { ko: "배우 우선", en: "Actor first" },
  "careers.stat.review":  { ko: "우선 검토", en: "Priority review" },
  "careers.section.casting": { ko: "찾고 있는 사람.", en: "Who we're looking for." },
  "careers.section.positions": { ko: "positions", en: "positions" },
  "careers.section.how":  { ko: "지원하는 법.", en: "How to apply." },
  "careers.how.step1.title": { ko: "공고 선택", en: "Pick a posting" },
  "careers.how.step1.body": { ko: "지원 페이지에서 진행 중인 오디션 공고를 골라요. 배우·작가·연출·운영 등 모든 포지션이 한 곳에 모여있어요.", en: "On the apply page, pick an open audition. All positions — actor, writer, director, producer — live in one place." },
  "careers.how.step2.title": { ko: "지원서 작성", en: "Fill out the application" },
  "careers.how.step2.body": { ko: "이름·연락처·짧은 자기소개와 작품 링크. 첨부 자료는 한 번에 업로드돼요. 양식 없음, 1~2분이면 끝.", en: "Name, contact, a short bio, and a link to your work. Attachments upload in one go. No fixed form — takes 1–2 min." },
  "careers.how.step3.title": { ko: "작가·대표 면담", en: "Meet the writers / CEO" },
  "careers.how.step3.body": { ko: "검토 후 1주 안에 회신해요. 줌 또는 합정 사무실에서 일하는 방식·작품 톤·기대치를 맞춰봐요.", en: "We reply within a week. Then a call (Zoom or in person at our Hapjeong office) to align on workflow, tone, and expectations." },
  "careers.row.other":    { ko: "채용 외 문의", en: "Non-hiring inquiries" },
  "careers.row.other.link": { ko: "응원 메시지 / 팬레터 보내기", en: "Send fan mail / supportive message" },
  "careers.row.visit":    { ko: "현장 견학", en: "Studio visit" },
  "careers.row.visit.body": { ko: "현재 비공개. 합류 결정 후 가능합니다.", en: "Closed for now. Available after joining the team." },
  "careers.lead.featured":{ ko: "Featured · 1st priority", en: "Featured · 1st priority" },
  "careers.apply.actor":  { ko: "배우로 지원하기", en: "Apply as actor" },

  // Careers — hero extras
  "careers.hero.nowcasting": { ko: "Now casting · Now hiring", en: "Now casting · Now hiring" },
  "careers.hero.headline.line1": { ko: "함께 한 컷을", en: "The next frame," },
  "careers.hero.headline.line2": { ko: "구울 사람.", en: "people to bake it." },
  "careers.hero.lede.before": { ko: "작은 스튜디오에서 시작해 매주 한 편씩 청춘의 한 장면을 굽고 있어요. ", en: "We started as a small studio and bake a youth scene every week. " },
  "careers.hero.lede.after":  { ko: "를 1순위로, 작가·연출·촬영·편집·운영 — 어느 자리든 결을 맞춰 오래 함께할 사람을 천천히 찾고 있습니다.", en: " is our top priority — writer, director, DP, editor, producer; we're slowly finding people we can match step for step, for the long haul." },
  "careers.stat.open":    { ko: "Open roles", en: "Open roles" },

  // Careers — primary CTAs
  "careers.cta.apply":           { ko: "지원하기", en: "Apply now" },
  "careers.cta.viewPositions":   { ko: "포지션 보기", en: "View positions" },

  // Careers — reel block
  "careers.reel.eyebrow": { ko: "Audition reel", en: "Audition reel" },
  "careers.reel.source":  { ko: "원본", en: "Source" },

  // Careers — WHY band
  "careers.why.eyebrow":   { ko: "— Why us", en: "— Why us" },
  "careers.why.quote.before":    { ko: "회사가 커진다고", en: "Even as the studio grows," },
  "careers.why.quote.highlight": { ko: "작품의 결이 흐려지면", en: "the grain of the work" },
  "careers.why.quote.after":     { ko: "안 된다.", en: "must not blur." },
  "careers.why.attribution":     { ko: "— Studio Cheeze, 2026", en: "— Studio Cheeze, 2026" },
  "careers.why.body1":     { ko: "대형 제작사처럼 분업화된 시스템보다, 한 사람이 처음부터 끝까지 작품에 깊게 관여하는 환경을 만들고 있어요. 본인 손으로 청춘 드라마 한 편을 굽는다는 감각이 무엇보다 중요합니다.", en: "Rather than the assembly-line setup of big studios, we're building a place where one person stays deeply involved with a project from start to finish. The feeling of baking a youth drama with your own hands matters more than anything." },
  "careers.why.body2":     { ko: "3년 안에 영화 한 편, 시리즈 한 시즌. 채널에서 만든 톤을 더 큰 포맷으로 옮기는 일을 진지하게 준비 중이고, 거기에 손을 보태고 싶은 분이라면 좋아요.", en: "One feature film and one series season within three years. We're seriously preparing to move the channel's tone into larger formats, and we'd love anyone who wants to lend a hand." },

  // Careers — WHO band
  "careers.who.eyebrow":   { ko: "— Casting call · 02", en: "— Casting call · 02" },

  // Careers — HOW band
  "careers.how.eyebrow":   { ko: "How to apply · 03", en: "How to apply · 03" },
  "careers.how.title":     { ko: "지원, 어렵지 않아요.", en: "Applying is easy." },
  "careers.how.summary":   { ko: "3 steps · 1 form", en: "3 steps · 1 form" },

  // Careers — final apply block
  "careers.apply.eyebrow": { ko: "Apply now", en: "Apply now" },
  "careers.apply.headline.line1": { ko: "지원서 한 장이면", en: "One application" },
  "careers.apply.headline.line2": { ko: "다음 단계로.", en: "is all it takes." },
  "careers.apply.body":    { ko: "모든 지원은 같은 폼을 통해 받고 있어요. 공고를 고른 뒤 짧은 양식만 채우시면, 작가·대표가 직접 확인합니다.", en: "Every application comes through the same form. Pick a posting, fill out a short form, and the writers and CEO review it directly." },
  "careers.apply.cta":     { ko: "지원 페이지로", en: "To the apply page" },

  // Careers role data
  "role.actor.title":     { ko: "배우 (주연/조연)", en: "Actor (lead / supporting)" },
  "role.actor.desc":      { ko: "치즈필름 신작의 얼굴이 될 배우. 10~30분짜리 단편 안에서 청춘의 한 컷을 진짜처럼 살아낼 수 있는 분.", en: "The face of CheezeFilm's next project. Someone who can make a youth moment feel real inside a 10–30 min short." },
  "role.actor.tag1":      { ko: "10대 후반~30대", en: "Late teens to 30s" },
  "role.actor.tag2":      { ko: "오디션 영상/프로필 필수", en: "Audition reel + profile required" },
  "role.actor.tag3":      { ko: "본업·부업 OK", en: "Full-time or side gig OK" },
  "role.writer.title":    { ko: "작가", en: "Writer" },
  "role.writer.desc":     { ko: "10분짜리 단편을 매주 한 편씩 굽는 작가. 청춘 드라마의 톤을 이해하고, 대사로 인물을 살릴 수 있는 분.", en: "A writer who bakes a 10-min short every week. Understands youth drama tone and brings characters alive through dialogue." },
  "role.writer.tag1":     { ko: "단편 시나리오 경력", en: "Short-script experience" },
  "role.writer.tag2":     { ko: "치즈필름 채널 시청 다수", en: "Watches CheezeFilm regularly" },
  "role.writer.tag3":     { ko: "협업 가능한 분", en: "Collaboration-friendly" },
  "role.director.title":  { ko: "연출", en: "Director" },
  "role.director.desc":   { ko: "현장을 책임지는 연출. 한 회차 안에서 인물의 작은 변화를 카메라로 잡아내는 데 관심이 많은 분.", en: "Owns the set. Loves catching the smallest shifts in character through the camera within a single episode." },
  "role.director.tag1":   { ko: "단편 연출 1편 이상", en: "1+ short film directed" },
  "role.director.tag2":   { ko: "스토리보드 가능", en: "Comfortable with storyboards" },
  "role.director.tag3":   { ko: "여러 톤 소화 가능", en: "Range across tones" },
  "role.dp.title":        { ko: "촬영 · 조명", en: "Cinematography · Lighting" },
  "role.dp.desc":         { ko: "현장에서 빛과 구도를 책임지는 사람. DSLR/미러리스 · 시네마 카메라 모두 환영.", en: "Owns light and framing on set. DSLR / mirrorless / cinema cameras all welcome." },
  "role.dp.tag1":         { ko: "기본 장비 운용", en: "Core gear operation" },
  "role.dp.tag2":         { ko: "조명 셋업 가능", en: "Lighting setup" },
  "role.dp.tag3":         { ko: "야외 촬영 OK", en: "Outdoor shoots OK" },
  "role.editor.title":    { ko: "편집", en: "Editor" },
  "role.editor.desc":     { ko: "한 컷의 길이가 작품의 결을 결정한다고 믿는 분. 음악·SFX 감각이 함께 있는 분 우대.", en: "Believes the length of a single cut defines a film's grain. Music / SFX sensibility a plus." },
  "role.editor.tag1":     { ko: "Premiere/DaVinci 능숙", en: "Premiere / DaVinci fluent" },
  "role.editor.tag2":     { ko: "컬러 그레이딩 경험", en: "Color grading experience" },
  "role.editor.tag3":     { ko: "쇼츠 편집 별도", en: "Shorts editing also welcome" },
  "role.pd.title":        { ko: "운영 · PD", en: "Producer / PD" },
  "role.pd.desc":         { ko: "촬영 일정, 출연자 케어, 예산 관리. 작품이 차질 없이 굴러가도록 안 보이는 곳에서 일하는 분.", en: "Shoot schedules, cast care, budgets — the invisible work that keeps every project on track." },
  "role.pd.tag1":         { ko: "스케줄 관리", en: "Schedule management" },
  "role.pd.tag2":         { ko: "외부 커뮤니케이션", en: "External communications" },
  "role.pd.tag3":         { ko: "엑셀/노션", en: "Excel / Notion" },

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

// `tc(map, key, lang)` was removed — the codebase uses
// `getContent(map, key, lang)` from `lib/content.ts` (which carries the
// same English-fallback contract) at every call site. Kept the header
// comment above as the system-of-record for the i18n conventions.
