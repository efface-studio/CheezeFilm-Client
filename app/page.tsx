import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { getAllVideos } from "@/lib/youtube";
import { getContent, loadContentMap } from "@/lib/content";
import { getMembers } from "@/lib/members";
import { storageUrl } from "@/lib/db";
import { getServerLang } from "@/lib/i18n.server";
import { t, translateRoleLabel } from "@/lib/i18n";
import { resolveMemberNameEn } from "@/lib/koreanRomanizer";
import { InView, StaggerText } from "@/components/Stagger";
import HeroCover from "@/components/HeroCover";
import CountUp from "@/components/CountUp";
import SiteNav from "@/components/SiteNav";
import SnapScroller from "@/components/SnapScroller";
import CareersReel from "@/components/CareersReel";
import { getCoverPhotos } from "@/lib/coverPhotos";
import { getOpenListings, formatDeadline } from "@/lib/auditionListings";

/** Per-role color accents for the open-roles preview cards.
 *  - Lead    → brand purple (the headline slot)
 *  - Support → teal   (secondary cast)
 *  - Extra   → amber  (small parts; warm but lower-priority)
 *  - Staff   → zinc   (off-camera; neutral)
 *  Tailwind classes only; no per-color CSS so the bundle stays flat.
 */
const ROLE_ACCENT: Record<string, { ribbon: string; chip: string }> = {
  lead:    { ribbon: "bg-cheeze-purple",      chip: "bg-cheeze-purple/12 text-cheeze-purple-deep" },
  support: { ribbon: "bg-teal-500",            chip: "bg-teal-50 text-teal-700" },
  extra:   { ribbon: "bg-amber-400",           chip: "bg-amber-50 text-amber-800" },
  staff:   { ribbon: "bg-zinc-400",            chip: "bg-zinc-100 text-zinc-700" },
};

// ISR — the home pulls Supabase content, members, videos, and cover photos.
// All of those are also wrapped in `unstable_cache` keyed by content/members/
// listings/covers tags, so admin writes use `revalidateTag` to flush
// immediately. The page-level revalidate caps how long a fully cold edit
// path can lag if a tag invalidation is missed.
export const revalidate = 300;
// Page-level metadata — `title.absolute` bypasses the layout's "%s | 치즈필름"
// template since the brand is already in the home title. `og:image` is
// re-stated per page because page-level `openGraph` replaces the layout
// block entirely (Next merges metadata per-field, not deep).
export const metadata = {
  title: { absolute: "치즈필름 — 스토리를 굽는 사람들" },
  description:
    "웹드라마 스튜디오 치즈필름의 공식 팬 사이트. 신작·캐스트·오디션 소식을 한 곳에서.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "치즈필름 — 스토리를 굽는 사람들",
    description: "신작·캐스트·오디션 소식을 한 곳에서 만나보세요.",
    url: "/",
    type: "website",
    images: ["/cheeze-logo.png"],
  },
  twitter: { images: ["/cheeze-logo.png"] },
};

export default async function HomePage() {
  // Page top awaits only the FAST data — contentMap (Supabase, cached),
  // members (Supabase, cached), and coverPhotos (Supabase Storage list).
  // The slow `getAllVideos()` (which HEAD-probes ~500 videos for shorts
  // classification on cold serverless) is awaited LATER inside the
  // streaming sub-components (LiveStatsBar, FilmsSection, ShortsStrip).
  // The module-level memo in getAllVideos coalesces those concurrent
  // calls into a single fetch — so it only runs once per render.
  const [lang, contentMap, members, coverPhotos, openListings] = await Promise.all([
    getServerLang(),
    loadContentMap(),
    getMembers(),
    getCoverPhotos(),
    getOpenListings(),
  ]);
  // `c(key)` now picks the English variant (`${key}.en`) when the
  // user is in EN mode and that variant has been set in admin →
  // 콘텐츠. Falls back to Korean otherwise so the page never blanks.
  const c = (key: string) => getContent(contentMap, key, lang);

  // Admin-set hero video slots (10 max). When the admin hasn't picked
  // one for a slot we used to fall back to `longform[i]?.id`, but that
  // requires awaiting getAllVideos — which we now defer. The fallback
  // is gone; HeroCover degrades gracefully to "photos only" when no
  // videoIds are set, and the admin's picks remain authoritative.
  const heroVideos = Array.from({ length: 10 }, (_, i) =>
    c(`works.${i + 1}.videoId`).trim(),
  ).filter(Boolean);

  return (
    // `data-site-home` opts this page into scroll-snap (see globals.css).
    // The `html:has(...)` selector pins each direct `<section>` to a snap
    // point so scrolling rests on a clean section boundary instead of
    // drifting between them.
    <main
      data-site-home
      className="min-h-screen bg-cheeze-cream text-cheeze-ink editorial flex flex-col lg:pl-56"
    >
      <SnapScroller />
      <SiteHeader />

      {/* ── HERO ────────────────────────────────────────
          `data-nav-section="issue"` tells SiteNav's scroll-spy to treat
          the whole hero band as part of the "01 소개" item, so the rail
          highlights 소개 even before the user reaches the
          #issue section proper. The same data attribute is also on the
          marquee + the dedicated <section id="issue"> below — together
          they cover the entire intro spread. */}
      <section
        data-nav-section="issue"
        className="border-b border-cheeze-purple-deep/15 overflow-hidden"
      >
        <div className="mx-auto max-w-[100rem] px-6 pt-16 pb-20 grid lg:grid-cols-12 gap-x-10 gap-y-12">
          {/* Landscape cover → re-balanced grid: copy gets 7, cover gets 5.
              A 3:2 landscape photo in col-span-5 (~620px) lands at ~413px
              tall, which sits comfortably alongside the headline + CTA
              stack on the left without crushing either side. */}
          <div className="lg:col-span-6">
            {/* Toss-style eyebrow: small label pill with a status dot. */}
            <InView className="fade-up">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-toss-50 text-cheeze-purple text-[12px] font-semibold">
                <span aria-hidden className="block w-1.5 h-1.5 rounded-full bg-cheeze-purple" />
                {t("hero.badge", lang)}
              </span>
            </InView>
            <InView
              as="h1"
              className="typewriter mt-5 leading-[1.1] tracking-tight font-extrabold text-cheeze-ink"
              style={{ fontSize: "clamp(2.4rem, 6vw, 4.5rem)" }}
            >
              <StaggerText text={c("hero.title.line1")} mode="character" />
              <br />
              <span className="text-cheeze-purple">
                <StaggerText
                  text={c("hero.title.line2")}
                  mode="character"
                  // Continue --li from where line 1 left off so line 2
                  // types AFTER line 1 finishes instead of in parallel.
                  startIndex={
                    Array.from(c("hero.title.line1")).filter(
                      (ch) => ch !== " ",
                    ).length
                  }
                />
              </span>
            </InView>
            <InView className="fade-up" rootMargin="0px 0px -5% 0px">
              <p
                className="mt-8 max-w-xl text-[15px] sm:text-[16px] leading-relaxed text-cheeze-ink-soft whitespace-pre-line"
                style={{ transitionDelay: "300ms" }}
              >
                {c("hero.subtitle")}
              </p>
              <div
                className="mt-8 flex flex-wrap gap-3"
                style={{ transitionDelay: "450ms" }}
              >
                <a
                  href="https://www.youtube.com/@CheezeFilmz"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-cheeze-ink text-white font-semibold text-[14px] hover:bg-cheeze-ink-soft transition-colors"
                >
                  {/* Official YouTube glyph (rounded rectangle + play
                      triangle). Inline SVG so we don't pull a new icon
                      package in just for this. `#FF0000` matches the
                      brand red exactly. */}
                  <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    className="shrink-0"
                  >
                    <path
                      fill="#FF0000"
                      d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"
                    />
                    <path fill="#fff" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                  {t("hero.cta.youtube", lang)}
                  <span aria-hidden>↗</span>
                </a>
                <Link
                  href="/support"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-toss-50 text-cheeze-ink font-semibold text-[14px] hover:bg-toss-100 transition-colors"
                >
                  {t("hero.cta.audition", lang)}
                  <span aria-hidden>→</span>
                </Link>
              </div>
            </InView>
          </div>

          {/* Cover card with mask reveal — landscape photos win when present
              in /public/covers/, otherwise we cycle the 3 featured video
              thumbnails configured in admin. */}
          <aside className="lg:col-span-6 flex flex-col gap-4">
            <HeroCover photoSrcs={coverPhotos} videoIds={heroVideos} lang={lang} />
            {/* FILE · EDITION 02 caption removed — magazine masthead
                language doesn't fit the new clean surface. */}
          </aside>
        </div>

        {/* Stats strip — extracted into an async <LiveStatsBar> that
            awaits getAllVideos to surface live subscriber/view/video
            counts. Wrapped in Suspense with a synchronous fallback
            that renders the admin-set contentMap values immediately,
            so the first paint never shows blanks. When the live data
            resolves the streamed HTML swaps in instantly. */}
        <div className="border-t border-cheeze-purple-deep/15">
          <Suspense fallback={<StatsBar contentMap={contentMap} lang={lang} />}>
            <LiveStatsBar contentMap={contentMap} lang={lang} />
          </Suspense>
        </div>
      </section>

      {/* Marquee removed in the Toss redesign — endless-scroll editorial
          ribbons don't fit the new clean surface. Keeping the section
          divider so the hero/stats band still hands off visually. */}

      {/* "RECENT UPLOADS" used to live here as its own section but it was
          basically a smaller-scale duplicate of FILMS below. Merged into
          one section: featured 3 films at top, recent uploads grid below
          the divider. See /films section further down. */}

      {/* ── STORY ───────────────────────────────────── */}
      <section id="issue" className="border-b border-cheeze-purple-deep/15">
        <div className="mx-auto max-w-[100rem] px-6 py-16 md:py-24 grid lg:grid-cols-12 gap-10">
          <InView as="aside" className="fade-up lg:col-span-2">
            <div className="text-[10px] tracking-[0.4em] uppercase text-cheeze-olive">
              — Section 01
            </div>
            <div
              className="mt-3 text-[3rem] leading-none text-cheeze-purple"
              style={{ fontFamily: "var(--font-display)" }}
            >
              01
            </div>
          </InView>
          <div className="lg:col-span-6">
            <InView
              as="h2"
              className="display-title fade-up text-4xl md:text-5xl tracking-tight leading-[1.05]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {c("story.heading.before")}{" "}
              <span className="text-cheeze-purple">
                {c("story.heading.brand")}
              </span>{" "}
              {c("story.heading.after")}
            </InView>
            <InView className="fade-up mt-6 space-y-5 text-cheeze-ink-soft leading-relaxed text-[15px]">
              <p>{c("story.paragraph1")}</p>
              <p>{c("story.paragraph2")}</p>
            </InView>
          </div>
          <InView as="aside" className="fade-up lg:col-span-4 lg:border-l lg:border-cheeze-purple-deep/15 lg:pl-8">
            <blockquote
              className="text-2xl md:text-3xl leading-snug text-cheeze-purple-deep"
              style={{ fontFamily: "var(--font-display)" }}
            >
              “{t("story.quote", lang)}”
            </blockquote>
            <div className="mt-5 text-[11px] tracking-[0.3em] uppercase text-cheeze-olive">
              — Studio Cheeze, since 2017
            </div>
            {/* YouTube channel awards — single soft surface, hairline
                divider between cells, one bold label each. The earlier
                metallic-gradient chips read as loud; this version
                trusts the metal-coloured dots + clean typography. */}
            <div className="mt-10 rounded-2xl bg-toss-50 grid grid-cols-3 divide-x divide-toss-200/70">
              <AwardChip label={t("awards.silver", lang)} dotClass="bg-zinc-400" />
              <AwardChip label={t("awards.gold", lang)} dotClass="bg-amber-400" />
              <AwardChip label={t("awards.grand", lang)} dotClass="bg-cheeze-purple" />
            </div>
          </InView>
        </div>
      </section>

      {/* ── CAST ──────────────────────────────────────
          Moved above the films block per user request — the cast
          spread is the primary identity moment, so it earns the
          first slot after the about/story intro. */}
      <section id="cast" className="border-b border-cheeze-purple-deep/15">
        <div className="mx-auto max-w-[100rem] px-6 py-16 md:py-24">
          <div className="grid lg:grid-cols-12 mb-12 items-end">
            <InView className="fade-up lg:col-span-2">
              <div className="text-[10px] tracking-[0.4em] uppercase text-cheeze-olive">— Section 02</div>
              <div
                className="mt-3 text-[3rem] leading-none text-cheeze-purple"
                style={{ fontFamily: "var(--font-display)" }}
              >
                02
              </div>
            </InView>
            <InView className="fade-up display-title lg:col-span-7">
              <h2
                className="text-4xl md:text-5xl tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                The Cast.
              </h2>
              <p className="mt-3 text-cheeze-ink-soft">
                {lang === "en" ? "On both sides of the camera, baking together." : "카메라 앞과 뒤, 함께 굽는 사람들."}
              </p>
            </InView>
            <Link
              href="/members"
              className="lg:col-span-3 lg:text-right text-sm font-bold tracking-widest uppercase text-cheeze-purple hover:text-cheeze-purple-deep mt-4 lg:mt-0"
            >
              {lang === "en" ? "All members →" : "전체 멤버 →"}
            </Link>
          </div>

          {/* Cast grid — Toss-style photo cards.
              Editorial pick: a hand-curated set of six members shown on
              the home spread. Order in `FEATURED_CAST_NAMES` is the
              order they appear; only entries with an uploaded portrait
              actually render. The full roster (everyone, photo or not)
              is still at /members via the "전체 멤버 →" link above. */}
          {(() => {
            // First row of six, then a second row of six.
            // The grid is `lg:grid-cols-6` so the array order naturally
            // wraps after the sixth name on desktop.
            const FEATURED_CAST_NAMES = [
              // ── Row 1
              "조효민",
              "조채윤",
              "다솜",
              "민지",
              "선경",
              "유덕",
              // ── Row 2
              "소정",
              "윤오",
              "아윤",
              "주석",
              "주현",
              "예나",
            ] as const;
            const byName = new Map(members.map((m) => [m.name, m]));
            const featured = FEATURED_CAST_NAMES.map((n) => byName.get(n))
              .filter((m): m is NonNullable<typeof m> => Boolean(m?.photoPath));
            return (
              <ol className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-5">
                {featured.map((m, i) => (
                  <InView
                    key={m.slug}
                    as="li"
                    className="fade-up"
                    style={{ transitionDelay: `${i * 60}ms` } as React.CSSProperties}
                  >
                    <Link
                      href={`/members/${encodeURIComponent(m.slug)}`}
                      className="group block"
                    >
                      <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-toss-100">
                        {/* photoPath is required to enter this list, so
                            we know `m.photoPath` is set — the `!` is
                            informational, not assertive. */}
                        <Image
                          src={storageUrl("members", m.photoPath!)}
                          alt={m.name}
                          fill
                          sizes="(min-width: 1024px) 16vw, (min-width: 768px) 32vw, 50vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          // Cast strip sits below hero + stats + issue —
                          // never the LCP. Lazy so first paint isn't
                          // contending with 12 portrait fetches.
                          loading="lazy"
                        />
                      </div>
                      <div className="mt-3 px-1">
                        <div className="text-[15px] font-bold text-cheeze-ink tracking-tight truncate">
                          {lang === "en" ? resolveMemberNameEn(m.name, m.nameEn) : m.name}
                        </div>
                        <div className="mt-0.5 text-[12px] text-cheeze-ink-soft truncate">
                          {translateRoleLabel(m.roleLabel, lang)}
                        </div>
                      </div>
                    </Link>
                  </InView>
                ))}
              </ol>
            );
          })()}
        </div>
      </section>

      {/* ── FILMS ───────────────────────────────────── */}
      <section id="films" className="border-b border-cheeze-purple-deep/15">
        <div className="mx-auto max-w-[100rem] px-6 py-16 md:py-24">
          <div className="grid lg:grid-cols-12 mb-12 items-end">
            <InView className="fade-up lg:col-span-2">
              <div className="text-[10px] tracking-[0.4em] uppercase text-cheeze-olive">— Section 03</div>
              <div
                className="mt-3 text-[3rem] leading-none text-cheeze-purple"
                style={{ fontFamily: "var(--font-display)" }}
              >
                03
              </div>
            </InView>
            <InView as="div" className="fade-up display-title lg:col-span-7">
              <h2
                className="text-4xl md:text-5xl tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Filmography.
              </h2>
              <p className="mt-3 text-cheeze-ink-soft">
                {t("films.section.subtitle.home", lang)}
              </p>
            </InView>
            <div className="lg:col-span-3 lg:text-right mt-4 lg:mt-0">
              <Link
                href="/videos"
                className="text-sm font-bold tracking-widest uppercase text-cheeze-purple hover:text-cheeze-purple-deep"
              >
                {t("films.section.cta", lang)}
              </Link>
            </div>
          </div>

          {/* Films grid — featured 3 + recent 6 — extracted into a
              streaming async component so the heading above renders
              immediately while the cards stream in. Suspense fallback
              shows a layout-matched skeleton. */}
          <Suspense fallback={<FilmsGridSkeleton />}>
            <FilmsGrid heroVideos={heroVideos} lang={lang} />
          </Suspense>
        </div>
      </section>

      {/* ── SHORTS strip ─────────────────────────────── */}
      {/* Extracted into a streaming async component so the whole strip
          arrives once `getAllVideos()` resolves. No skeleton — if the
          channel has no shorts (or we're still waiting) the entire
          section is omitted; users seeing it gradually appear is fine
          and avoids a layout shift for empty channels. */}
      <Suspense fallback={null}>
        <ShortsStripSection lang={lang} />
      </Suspense>

      {/* ── CAREERS teaser ──────────────────────────── */}
      {/* Compact preview of the full careers page so users don't have to
          click through to get the gist. Shows: heading, the reel, and the
          top 4 role chips (actor leads — that's the open audition focus).
          Full details + email CTA live on /careers. */}
      <section id="careers" className="border-b border-cheeze-purple-deep/15">
        <div className="mx-auto max-w-[100rem] px-6 py-16 md:py-24 grid lg:grid-cols-12 gap-x-10 gap-y-12">
          <InView className="fade-up lg:col-span-2">
            <div className="text-[10px] tracking-[0.4em] uppercase text-cheeze-olive">
              — Section 05
            </div>
            <div
              className="mt-3 text-[3rem] leading-none text-cheeze-purple"
              style={{ fontFamily: "var(--font-display)" }}
            >
              04
            </div>
          </InView>

          {/* Left column — copy + role chips */}
          <div className="lg:col-span-6 flex flex-col">
            <InView className="fade-up display-title">
              <h2
                className="text-4xl md:text-5xl tracking-tight leading-[1.05]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                <span className="text-cheeze-purple">{t("roles.lead", lang)}</span>
                <span className="whitespace-pre-line">{t("roles.intro", lang)}</span>
              </h2>
              <p className="mt-6 max-w-xl text-cheeze-ink-soft leading-relaxed">
                {t("roles.copy", lang)}
              </p>
            </InView>

            <InView className="fade-up mt-8">
              <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-5">
                {[
                  { num: "01", title: t("role1.title", lang), desc: t("role1.desc", lang) },
                  { num: "02", title: t("role2.title", lang), desc: t("role2.desc", lang) },
                  { num: "03", title: t("role3.title", lang), desc: t("role3.desc", lang) },
                  { num: "04", title: t("role4.title", lang), desc: t("role4.desc", lang) },
                ].map((r, i) => (
                  <li
                    key={r.title}
                    className={`flex items-baseline gap-3 ${i === 0 ? "border-l-2 border-cheeze-purple pl-3" : "pl-3"}`}
                  >
                    <span className="font-mono text-[10px] tracking-wider tabular-nums text-cheeze-olive/70">
                      {r.num}
                    </span>
                    <div>
                      <h3
                        className="text-xl tracking-tight"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {r.title}
                        {i === 0 && (
                          <span className="ml-2 text-[9px] font-mono tracking-widest uppercase bg-cheeze-purple text-cheeze-cream px-1.5 py-0.5 align-middle">
                            {lang === "en" ? "TOP" : "1순위"}
                          </span>
                        )}
                      </h3>
                      <p className="mt-1 text-[13px] text-cheeze-ink-soft leading-relaxed">
                        {r.desc}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </InView>

            <InView className="fade-up mt-10 flex flex-wrap gap-3">
              <Link
                href="/careers"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-cheeze-ink text-white text-[14px] font-semibold hover:bg-cheeze-ink-soft transition-colors"
              >
                {lang === "en" ? "Full careers page" : "전체 채용 정보"}
                <span aria-hidden>→</span>
              </Link>
              <Link
                href="/support?tab=audition"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-toss-50 text-cheeze-ink text-[14px] font-semibold hover:bg-toss-100 transition-colors"
              >
                {lang === "en" ? "Apply" : "지원하기"}
                <span aria-hidden>→</span>
              </Link>
            </InView>

            {/* Live open-roles preview — fills the otherwise-empty
                space below the CTAs. Only renders when at least one
                listing is currently `open` (admin → 지원 공고). Each
                listing chips its role label + a short title +
                deadline. Click → /support?tab=audition where the form
                already filters by these listings. */}
            {openListings.length > 0 && (
              <InView className="fade-up mt-10 pt-8 border-t border-cheeze-purple-deep/10">
                {/* Section header with live status dot + count, plus
                    an "Apply" link on the right. Spacing matches the
                    Toss reference: dense uppercase eyebrow, no extra
                    chrome around the count. */}
                <div className="flex items-baseline justify-between mb-5">
                  <div className="text-[10px] tracking-[0.35em] uppercase text-cheeze-olive flex items-center gap-2">
                    <span className="pulse-dot" />
                    <span className="font-bold text-cheeze-ink-soft">
                      {t("openroles.label", lang)}
                    </span>
                    <span className="text-cheeze-olive/40">·</span>
                    <span className="font-bold text-cheeze-purple-deep tabular-nums">
                      {openListings.length}
                      {t("openroles.unit", lang)}
                    </span>
                  </div>
                  <Link
                    href="/support?tab=audition"
                    className="inline-flex items-center gap-1.5 text-[11px] tracking-widest uppercase font-bold text-cheeze-purple-deep hover:text-cheeze-purple group/all"
                  >
                    {t("openroles.viewAll", lang)}
                    <span
                      aria-hidden
                      className="transition-transform group-hover/all:translate-x-0.5"
                    >
                      →
                    </span>
                  </Link>
                </div>
                {/* Role-type color accents. Each card gets a 1.5px
                    left ribbon in its role's color so the list reads
                    as scannable at a glance. Color choices map to the
                    role's "weight" — lead=brand purple, support=teal,
                    extra=amber, staff=zinc. */}
                <ul className="grid sm:grid-cols-2 gap-2.5">
                  {openListings.slice(0, 4).map((l) => {
                    const accent = ROLE_ACCENT[l.role_type] ?? ROLE_ACCENT.staff;
                    return (
                      <li key={l.id}>
                        <Link
                          href="/support?tab=audition"
                          className="group/listing relative flex items-center gap-3 overflow-hidden rounded-2xl bg-white pl-5 pr-4 py-3.5 ring-1 ring-cheeze-purple-deep/[0.08] hover:ring-cheeze-purple-deep/25 hover:shadow-[0_4px_20px_-6px_rgba(85,34,163,0.22)] hover:-translate-y-px transition-all"
                        >
                          {/* Left accent ribbon — colored by role type */}
                          <span
                            aria-hidden
                            className={`absolute left-0 inset-y-0 w-1 ${accent.ribbon}`}
                          />
                          {/* Role-type chip */}
                          <span
                            className={`shrink-0 inline-flex items-center justify-center h-6 px-2.5 rounded-md text-[10px] font-bold tracking-[0.15em] uppercase ${accent.chip}`}
                          >
                            {t(`role.type.${l.role_type}`, lang)}
                          </span>
                          {/* Title — main affordance */}
                          <span className="flex-1 min-w-0 text-[14px] font-semibold text-cheeze-ink truncate group-hover/listing:text-cheeze-purple-deep transition-colors">
                            {l.title}
                          </span>
                          {/* Deadline — only shows date, not time, to
                              keep cards readable */}
                          {l.deadline && (
                            <span className="shrink-0 hidden sm:inline-block text-[11px] font-mono tabular-nums text-cheeze-olive/80">
                              {formatDeadline(l.deadline)?.slice(0, 10) ?? l.deadline}
                            </span>
                          )}
                          <span
                            aria-hidden
                            className="shrink-0 text-cheeze-purple/30 group-hover/listing:text-cheeze-purple group-hover/listing:translate-x-0.5 transition-all"
                          >
                            →
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </InView>
            )}
          </div>

          {/* Right column — autoplaying reel */}
          <InView className="fade-up lg:col-span-4 lg:border-l lg:border-cheeze-purple-deep/15 lg:pl-8">
            <div className="text-[10px] tracking-[0.3em] uppercase text-cheeze-olive mb-3 flex items-center gap-2">
              <span className="pulse-dot" /> Audition reel
            </div>
            <CareersReel
              src="/reels/DQ_oNK3EW_w.mp4"
              label={t("careers.reel.label", lang)}
            />
            <a
              href="https://www.instagram.com/p/DQ_oNK3EW_w/"
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-[11px] tracking-[0.25em] uppercase text-cheeze-purple hover:text-cheeze-purple-deep"
            >
              {lang === "en" ? "View original on Instagram ↗" : "Instagram에서 원본 보기 ↗"}
            </a>
          </InView>
        </div>
      </section>

      {/* ── CTA / CONTACT ──────────────────────────── */}
      {/* `lg:-ml-56 lg:pl-56` breaks the purple bg out of the main's rail
          gutter so it spans the viewport edge-to-edge, then re-applies the
          inner padding so the content stays aligned with the rest of the
          page. Same trick as the footer. */}
      <section
        id="contact"
        className="bg-cheeze-purple-deep text-cheeze-cream lg:-ml-56 lg:pl-56"
      >
        <div className="mx-auto max-w-[100rem] px-6 py-16 md:py-24 grid lg:grid-cols-12 gap-10 items-end">
          <InView className="fade-up lg:col-span-7">
            <div className="text-[10px] tracking-[0.4em] uppercase text-cheeze-yellow flex items-center gap-2">
              <span className="pulse-dot" /> Section 05 · Take part
            </div>
            <h2
              className="mt-5 text-5xl md:text-6xl tracking-tight leading-[1] text-cheeze-yellow display-title"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {c("cta.heading.line1")}
              <br />
              {c("cta.heading.line2")}
            </h2>
            <p className="mt-6 max-w-xl text-cheeze-cream/80 leading-relaxed whitespace-pre-line">
              {c("cta.body")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/support?tab=audition"
                className="text-sm font-bold tracking-widest uppercase px-5 py-3 bg-cheeze-yellow text-cheeze-purple-deep hover:bg-cheeze-cream transition-colors"
              >
                Audition →
              </Link>
              <Link
                href="/support?tab=fan"
                className="text-sm font-bold tracking-widest uppercase px-5 py-3 border border-cheeze-yellow text-cheeze-yellow hover:bg-cheeze-yellow hover:text-cheeze-purple-deep transition-colors"
              >
                Fan Letter →
              </Link>
            </div>
          </InView>
          <InView className="fade-up lg:col-span-5 lg:border-l lg:border-cheeze-cream/15 lg:pl-10 space-y-6">
            <ContactRow label="Business" value={c("contact.business")} href={`mailto:${c("contact.business")}`} />
            <ContactRow label="Audition" value={c("contact.audition")} href={`mailto:${c("contact.audition")}`} />
            <ContactRow label="YouTube" value="@CheezeFilmz" href="https://www.youtube.com/@CheezeFilmz" />
            <ContactRow label="Instagram" value="@cheezefilm.official" href="https://www.instagram.com/cheezefilm.official/" />
          </InView>
        </div>
      </section>

      <SiteFooter isHome />
    </main>
  );
}

// ─── Shared site chrome ────────────────────────────────

// Re-exported as <SiteHeader /> so the existing `import { SiteHeader }` call
// sites across routes keep working. The actual UI now lives in the
// SiteNav client component — a left side rail on lg+ with IntersectionObserver
// scroll-spy, falling back to a sticky compact top bar on mobile.
export async function SiteHeader() {
  const lang = await getServerLang();
  return <SiteNav lang={lang} />;
}

export async function SiteFooter({ isHome = false }: { isHome?: boolean } = {}) {
  const year = new Date().getFullYear();
  const [lang, contentMap] = await Promise.all([
    getServerLang(),
    loadContentMap(),
  ]);
  const c = (key: string) => getContent(contentMap, key, lang);
  return (
    // On home we have the side rail on lg+, so main carries `lg:pl-56`. We
    // need the purple footer to reach the page edge while keeping its inner
    // text aligned, so we break out with `lg:-ml-56 lg:pl-56`. On subpages
    // the rail is hidden and main has no left padding, so we skip the
    // break-out — otherwise the footer overflows the viewport leftward.
    // `mt-auto` lets the parent `flex flex-col` main pin the footer to the
    // bottom when content is short (otherwise a cream gap appears).
    <footer
      className={`mt-auto bg-cheeze-purple-deep text-cheeze-cream border-t border-cheeze-purple-deep ${
        isHome ? "lg:-ml-56 lg:pl-56" : ""
      }`}
    >
      {/* ── Main grid: brand · links · contact ──────────── */}
      <div className="mx-auto max-w-[100rem] px-6 py-14 grid md:grid-cols-12 gap-x-10 gap-y-10">
        {/* Brand block (col-span-5) */}
        <div className="md:col-span-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex w-10 h-10 rounded-full overflow-hidden bg-cheeze-purple border border-cheeze-cream/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/cheeze-logo.png"
                alt="CheezeFilm"
                className="w-full h-full object-cover"
              />
            </span>
            <div>
              <div
                className="text-2xl text-cheeze-yellow leading-none"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {t("footer.brand.name", lang)}
              </div>
              <div className="mt-1 text-[10px] tracking-[0.35em] uppercase text-cheeze-cream/55">
                {t("footer.brand.editorial", lang)}
              </div>
            </div>
          </div>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-cheeze-cream/75 whitespace-pre-line">
            {c("footer.tagline")}
          </p>
          {/* Social buttons — branded glyphs + rounded soft fills.
              YouTube uses its red+white play badge, Instagram uses the
              official rounded-camera path with the brand gradient. */}
          <div className="mt-6 flex items-center gap-2">
            <a
              href="https://www.youtube.com/@CheezeFilmz"
              target="_blank"
              rel="noreferrer"
              className="group/social inline-flex items-center gap-2 pl-2 pr-3.5 py-2 rounded-full bg-white/10 hover:bg-white/15 backdrop-blur transition-colors"
              aria-label={t("aria.youtube", lang)}
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                width="22"
                height="22"
                className="shrink-0"
              >
                <path
                  fill="#FF0000"
                  d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"
                />
                <path fill="#fff" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
              <span className="text-[13px] font-semibold text-cheeze-cream">
                YouTube
              </span>
            </a>
            <a
              href="https://www.instagram.com/cheezefilm.official/"
              target="_blank"
              rel="noreferrer"
              className="group/social inline-flex items-center gap-2 pl-2 pr-3.5 py-2 rounded-full bg-white/10 hover:bg-white/15 backdrop-blur transition-colors"
              aria-label={t("aria.instagram", lang)}
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                width="22"
                height="22"
                className="shrink-0"
              >
                <defs>
                  <linearGradient
                    id="ig-grad"
                    x1="0%"
                    y1="100%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop offset="0%" stopColor="#F58529" />
                    <stop offset="50%" stopColor="#DD2A7B" />
                    <stop offset="100%" stopColor="#8134AF" />
                  </linearGradient>
                </defs>
                <rect
                  x="2"
                  y="2"
                  width="20"
                  height="20"
                  rx="5.5"
                  fill="url(#ig-grad)"
                />
                <circle
                  cx="12"
                  cy="12"
                  r="4.2"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="1.8"
                />
                <circle cx="17.4" cy="6.6" r="1.1" fill="#fff" />
              </svg>
              <span className="text-[13px] font-semibold text-cheeze-cream">
                Instagram
              </span>
            </a>
          </div>
        </div>

        {/* Quick links (col-span-3) */}
        <div className="md:col-span-3">
          <h4 className="text-[10px] tracking-[0.4em] uppercase text-cheeze-yellow font-bold">
            {t("footer.quicklinks", lang)}
          </h4>
          <ul className="mt-5 space-y-2.5 text-sm">
            <li>
              <Link
                href="/#issue"
                className="text-cheeze-cream/80 hover:text-cheeze-yellow transition-colors"
              >
                {t("footer.link.about", lang)}
              </Link>
            </li>
            <li>
              <Link
                href="/videos"
                className="text-cheeze-cream/80 hover:text-cheeze-yellow transition-colors"
              >
                {t("footer.link.films", lang)}
              </Link>
            </li>
            <li>
              <Link
                href="/members"
                className="text-cheeze-cream/80 hover:text-cheeze-yellow transition-colors"
              >
                {t("footer.link.members", lang)}
              </Link>
            </li>
            <li>
              <Link
                href="/support"
                className="text-cheeze-cream/80 hover:text-cheeze-yellow transition-colors"
              >
                {t("footer.link.audition", lang)}
              </Link>
            </li>
            <li>
              <Link
                href="/support?tab=fan"
                className="text-cheeze-cream/80 hover:text-cheeze-yellow transition-colors"
              >
                {t("footer.link.fan", lang)}
              </Link>
            </li>
          </ul>
        </div>

        {/* Studio info (col-span-4) — 문의 섹션이 home의 상단 contact
            섹션과 정확히 같은 정보였어서 중복이었음. 그 자리에 한국 법인
            정보(상호/대표/사업자등록번호 등)를 옮겨 넣었어요. */}
        <div className="md:col-span-4">
          <h4 className="text-[10px] tracking-[0.4em] uppercase text-cheeze-yellow font-bold">
            Studio Info
          </h4>
          <CompanyStrip contentMap={contentMap} lang={lang} />
        </div>
      </div>

      {/* ── Bottom strip: copyright + credit ────────────── */}
      <div className="border-t border-cheeze-cream/12">
        <div className="mx-auto max-w-[100rem] px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-cheeze-cream/70">
          <div>
            © {year} {c("company.name") || "(주)스튜디오 치즈"}. All rights reserved.
          </div>
          <div className="flex items-center gap-2">
            <span className="opacity-60">Crafted by</span>
            <a
              href="https://efface.dev"
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-1.5 font-bold text-cheeze-yellow hover:text-cheeze-cream transition-colors"
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-cheeze-yellow group-hover:bg-cheeze-cream transition-colors" />
              efface
              <span className="text-cheeze-cream/40 group-hover:text-cheeze-cream/70 transition-colors">
                · efface.dev ↗
              </span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/** 한국 푸터 컨벤션 — 상호·대표·사업자등록번호 등을 footer 4-col 안에
 *  맞춰 세로 리스트로. 좁은 영역에 가로 wrap 으로 흩뿌리면 가독성 떨어짐. */
function CompanyStrip({ contentMap, lang }: { contentMap: Map<string, string>; lang: import("@/lib/i18n").Lang }) {
  const c = (key: string) => getContent(contentMap, key, lang);
  const items = [
    { label: t("company.label.name", lang), value: c("company.name") },
    { label: t("company.label.ceo", lang), value: c("company.ceo") },
    { label: t("company.label.business_no", lang), value: c("company.business_no") },
    { label: t("company.label.commerce_no", lang), value: c("company.commerce_no") },
    { label: t("company.label.job_info_no", lang), value: c("company.job_info_no") },
    { label: "MCN", value: c("company.network") },
    { label: t("company.label.address", lang), value: c("company.address") },
    { label: t("company.label.phone", lang), value: c("company.phone") },
  ].filter((it) => it.value && it.value !== "—");
  return (
    <dl className="mt-5 grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-2 text-[12px]">
      {items.map((it) => (
        <div key={it.label} className="contents">
          <dt className="text-[10px] tracking-[0.2em] uppercase text-cheeze-cream/40 pt-0.5">
            {it.label}
          </dt>
          <dd className="text-cheeze-cream/85 break-words">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

// ─── Streaming sub-components ─────────────────────────────
//
// Each of these awaits `getAllVideos()` inside its body so the page
// shell can render without blocking on YouTube. `getAllVideos` has a
// module-level memo + in-flight coalescing, so the three concurrent
// calls (LiveStatsBar, FilmsGrid, ShortsStripSection) collapse into
// one real network fetch.

/** Sync stats — uses only contentMap. Shown as the Suspense fallback
    for LiveStatsBar so the strip is never blank during stream. */
function StatsBar({ contentMap, lang }: { contentMap: Map<string, string>; lang: import("@/lib/i18n").Lang }) {
  const c = (key: string) => getContent(contentMap, key, lang);
  return (
    // On phones the 2x2 grid used `divide-x` which adds a left border
    // to every child past the first — including the third cell, which
    // is row 2 column 1 and shouldn't have a vertical line above its
    // neighbour. We switch dividers off below `md` and use grid `gap`
    // + a subtle top border on row 2 instead so the band reads as a
    // tidy 2x2 instead of three stray lines + one missing one.
    <div className="mx-auto max-w-[100rem] px-6 py-7 grid grid-cols-2 gap-y-5 md:gap-y-0 md:grid-cols-4 md:divide-x md:divide-cheeze-purple-deep/10">
      <Stat
        label={c("stats.subscribers.label")}
        value={Number(c("stats.subscribers")) || 0}
        suffix={c("stats.subscribers.suffix")}
        fallback={`${c("stats.subscribers")}${c("stats.subscribers.suffix")}`}
        decimals={2}
      />
      <Stat
        label={c("stats.videos.label")}
        value={Number(c("stats.videos")) || 0}
        suffix={c("stats.videos.suffix")}
        fallback={`${c("stats.videos")}${c("stats.videos.suffix")}`}
      />
      <Stat
        label={c("stats.views.label")}
        value={Number(c("stats.views")) || 0}
        suffix={c("stats.views.suffix")}
        fallback={`${c("stats.views")}${c("stats.views.suffix")}`}
        decimals={1}
      />
      <Stat label={c("stats.year.label")} value={2017} fallback={c("stats.year")} />
    </div>
  );
}

/** Live stats — awaits getAllVideos for subscribers / views / video
    count from the YouTube Data API. Falls back to contentMap values
    when the API is missing or returns nothing. */
async function LiveStatsBar({ contentMap, lang }: { contentMap: Map<string, string>; lang: import("@/lib/i18n").Lang }) {
  const c = (key: string) => getContent(contentMap, key, lang);
  const { longform, shorts, subscriberCount, viewCount, totalCount } = await getAllVideos();
  const liveSubscribersM =
    typeof subscriberCount === "number" ? subscriberCount / 1_000_000 : null;
  const liveViews억 =
    typeof viewCount === "number" ? viewCount / 100_000_000 : null;
  const liveVideoCount =
    typeof totalCount === "number" ? totalCount : longform.length + shorts.length;
  return (
    // Same mobile fix as StatsBar above — dividers only render at md+
    // so the 2x2 mobile grid doesn't carry stray verticals into row 2.
    <div className="mx-auto max-w-[100rem] px-6 py-7 grid grid-cols-2 gap-y-5 md:gap-y-0 md:grid-cols-4 md:divide-x md:divide-cheeze-purple-deep/10">
      <Stat
        label={c("stats.subscribers.label")}
        value={liveSubscribersM ?? Number(c("stats.subscribers")) ?? 0}
        suffix={c("stats.subscribers.suffix")}
        fallback={`${c("stats.subscribers")}${c("stats.subscribers.suffix")}`}
        decimals={2}
      />
      <Stat
        label={c("stats.videos.label")}
        value={liveVideoCount}
        suffix={c("stats.videos.suffix")}
        fallback={`${c("stats.videos")}${c("stats.videos.suffix")}`}
      />
      <Stat
        label={c("stats.views.label")}
        value={liveViews억 ?? Number(c("stats.views")) ?? 0}
        suffix={c("stats.views.suffix")}
        fallback={`${c("stats.views")}${c("stats.views.suffix")}`}
        decimals={1}
      />
      <Stat label={c("stats.year.label")} value={2017} fallback={c("stats.year")} />
    </div>
  );
}

/** Skeleton for FilmsGrid — 3 featured + 6 recent layout shape. */
function FilmsGridSkeleton() {
  return (
    <>
      <div className="grid md:grid-cols-3 gap-x-6 gap-y-12">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="space-y-3">
            <div className="aspect-[16/10] rounded-2xl bg-toss-100 home-shimmer" />
            <div className="h-6 w-1/2 rounded-md bg-toss-100 home-shimmer" />
            <div className="h-3 w-1/3 rounded-md bg-toss-100 home-shimmer" />
          </div>
        ))}
      </div>
      <style>{`
        @keyframes home-shimmer { 0%,100%{opacity:0.55} 50%{opacity:0.85} }
        .home-shimmer { animation: home-shimmer 1400ms ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .home-shimmer { animation: none !important; opacity: 0.7 !important; } }
      `}</style>
    </>
  );
}

/** Films grid — 3 featured (from heroVideos) + 6 recent (from
    longform, skipping the featured). Awaits getAllVideos for the
    recent uploads list. */
async function FilmsGrid({ heroVideos, lang }: { heroVideos: string[]; lang: import("@/lib/i18n").Lang }) {
  const { longform } = await getAllVideos();
  const featuredIds = new Set(heroVideos);
  const recent = longform.filter((v) => !featuredIds.has(v.id)).slice(0, 6);
  return (
    <>
      <div className="grid md:grid-cols-3 gap-x-6 gap-y-12">
        {heroVideos.slice(0, 3).map((vid, i) => (
          <FilmCard
            key={vid}
            videoId={vid}
            number={String(i + 1).padStart(2, "0")}
            title={[t("film1.title", lang), t("film2.title", lang), t("film3.title", lang)][i] ?? ""}
            year={[t("films.year.series", lang), t("films.year.anthology", lang), t("films.year.fourpart", lang)][i] ?? ""}
            tagline={[t("film1.tagline", lang), t("film2.tagline", lang), t("film3.tagline", lang)][i] ?? ""}
            delay={i * 120}
          />
        ))}
      </div>
      {recent.length > 0 && (
        <div className="mt-20 pt-12 border-t border-cheeze-purple-deep/15">
          <InView className="fade-up flex items-baseline justify-between gap-6 mb-8">
            <div>
              <div className="text-[10px] tracking-[0.4em] uppercase text-cheeze-olive">
                — Just dropped
              </div>
              <h3 className="mt-2 text-2xl md:text-3xl tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                {t("films.recent.title", lang)}
              </h3>
            </div>
            <Link
              href="/videos"
              className="text-[11px] tracking-widest uppercase font-bold text-cheeze-purple-deep hover:text-cheeze-purple border-b border-cheeze-purple-deep/30 hover:border-cheeze-purple pb-1 transition-colors whitespace-nowrap"
            >
              {t("films.recent.viewAll", lang)}
            </Link>
          </InView>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
            {recent.map((v, i) => (
              <InView
                key={v.id}
                className="fade-up"
                style={{ transitionDelay: `${(i % 3) * 60}ms` } as React.CSSProperties}
              >
                <a href={v.url} target="_blank" rel="noreferrer" className="group block film">
                  <div className="aspect-[16/10] relative overflow-hidden bg-cheeze-charcoal">
                    <Image
                      src={v.thumbnail}
                      alt={v.title}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                      // No `quality={85}` here — these thumbs are below
                      // the fold (Hero + Stats + Issue + Cast sections
                      // render above them) and lazy-loaded. Default 75
                      // ships ~15-20% smaller AVIF/WebP per thumb with
                      // no perceptible quality loss for YouTube poster
                      // shots at this size.
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-cheeze-charcoal/60 via-transparent to-transparent" />
                    {i === 0 && (
                      <span className="absolute top-3 left-3 bg-cheeze-yellow text-cheeze-purple-deep text-[9px] font-bold tracking-widest uppercase px-2 py-1">
                        New
                      </span>
                    )}
                    <span className="absolute bottom-3 right-3 bg-cheeze-charcoal/85 text-cheeze-cream text-[10px] font-mono tracking-wider px-2 py-1">
                      {new Date(v.publishedAt).toLocaleDateString(lang === "en" ? "en-US" : "ko-KR", { month: "2-digit", day: "2-digit" })}
                    </span>
                  </div>
                  <h4 className="mt-3 text-[15px] font-bold leading-snug text-cheeze-ink line-clamp-2 group-hover:text-cheeze-purple transition-colors">
                    {v.title}
                  </h4>
                  <div className="mt-1 text-[10px] tracking-widest uppercase text-cheeze-olive">
                    {new Date(v.publishedAt).toLocaleDateString(lang === "en" ? "en-US" : "ko-KR", { year: "numeric", month: "long", day: "numeric" })}
                  </div>
                </a>
              </InView>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/** Shorts strip — full section including header. Renders nothing
    when the channel has no shorts (or we're still loading), so no
    fallback is needed in the parent Suspense. */
async function ShortsStripSection({ lang }: { lang: import("@/lib/i18n").Lang }) {
  const { shorts } = await getAllVideos();
  if (shorts.length === 0) return null;
  return (
    <section
      data-nav-section="films"
      className="border-b border-cheeze-purple-deep/15"
    >
      <div className="mx-auto max-w-[100rem] px-6 py-20">
        <div className="flex items-baseline justify-between mb-8">
          <InView className="fade-up">
            <div className="text-[10px] tracking-[0.4em] uppercase text-cheeze-olive">— Section 03</div>
            <h2 className="mt-2 text-3xl md:text-4xl tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              {lang === "en" ? (
                <>Shorts.</>
              ) : (
                <>Shorts <span className="text-cheeze-purple">/</span> 한 입.</>
              )}
            </h2>
          </InView>
          <Link
            href="/videos?kind=shorts"
            className="text-sm font-bold tracking-widest uppercase text-cheeze-purple hover:text-cheeze-purple-deep"
          >
            {t("shorts.viewAll", lang)}
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {shorts.slice(0, 12).map((v, i) => (
            <InView
              key={v.id}
              className="fade-up"
              style={{ transitionDelay: `${i * 50}ms` } as React.CSSProperties}
            >
              <a
                href={v.url}
                target="_blank"
                rel="noreferrer"
                className="group block aspect-[9/16] overflow-hidden bg-cheeze-charcoal relative film"
              >
                <Image
                  src={v.thumbnail}
                  alt={v.title}
                  fill
                  sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
                  className="object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-cheeze-charcoal/85 to-transparent" />
                <div className="absolute inset-x-2 bottom-2 text-[11px] leading-snug text-cheeze-cream line-clamp-2">
                  {v.title}
                </div>
              </a>
            </InView>
          ))}
        </div>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  suffix = "",
  fallback,
  decimals = 0,
}: {
  label: string;
  value: number;
  suffix?: string;
  fallback: string;
  decimals?: number;
}) {
  return (
    // Mobile (2x2 grid): the leftmost cell of each row needs pl-0 so
    // numbers line up flush with the section padding. The first-child
    // selector only fires for item 1 — without `odd:pl-0` here, "16.5억"
    // (item 3, row 2 col 1) was indented compared to "3.45M+" (item 1
    // above it). At md+ the four cells live in one row so the only
    // flush-left cell is item 1, exactly what `first:` already covers.
    <InView className="fade-up pr-4 pl-4 odd:pl-0 md:pl-4 md:first:pl-0">
      <div className="text-[28px] md:text-[32px] font-extrabold text-cheeze-ink tracking-tight tabular-nums leading-none">
        <CountUp value={value} suffix={suffix} fallback={fallback} decimals={decimals} duration={1400} />
      </div>
      <div className="mt-2 text-[12px] text-cheeze-ink-soft">
        {label}
      </div>
    </InView>
  );
}

/**
 * Channel award chip — one cell of the three-up awards strip. Just a
 * coloured dot + bold label. The wrapping container handles the
 * surface + dividers; the cell stays minimal so the three awards read
 * as a unit, not three competing buttons.
 */
function AwardChip({
  label,
  dotClass,
}: {
  label: string;
  dotClass: string;
}) {
  return (
    // Mobile chip — vertical layout (dot above label) so the 3-up
    // award row doesn't crush Korean labels (실버 골버튼 / 골드 / 대상)
    // into a single wrapped line. At sm+ we go back to inline so the
    // chips read as a tight horizontal trio next to the story column.
    <div className="px-2 py-3 sm:px-3 sm:py-4 flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 text-center">
      <span aria-hidden className={`block w-2 h-2 rounded-full ${dotClass}`} />
      <span className="text-[12px] sm:text-[13px] font-bold tracking-tight text-cheeze-ink">
        {label}
      </span>
    </div>
  );
}

function FilmCard({
  videoId,
  number,
  title,
  year,
  tagline,
  delay = 0,
}: {
  videoId: string;
  number: string;
  title: string;
  year: string;
  tagline: string;
  delay?: number;
}) {
  return (
    <InView
      className="fade-up"
      style={{ transitionDelay: `${delay}ms` } as React.CSSProperties}
    >
      <a
        href={videoId ? `https://www.youtube.com/watch?v=${videoId}` : "https://www.youtube.com/@CheezeFilmz/videos"}
        target="_blank"
        rel="noreferrer"
        className="group block film"
      >
        <div className="aspect-[3/4] relative overflow-hidden bg-cheeze-charcoal">
          {videoId && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`}
                alt={title}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-cheeze-charcoal/70 via-cheeze-charcoal/0 to-transparent" />
            </>
          )}
          <div className="absolute top-3 left-4 text-cheeze-yellow font-mono text-[11px] tracking-[0.3em]">
            № {number}
          </div>
          <div className="absolute inset-x-0 bottom-0 p-4">
            <div className="text-[10px] tracking-[0.3em] uppercase text-cheeze-cream/80">{year}</div>
          </div>
          <div className="film__hint">
            <span className="text-[11px] tracking-widest uppercase">▸ Watch</span>
          </div>
        </div>
        <div className="mt-4">
          <h3 className="text-2xl tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            {title}
          </h3>
          <p className="mt-2 italic text-cheeze-ink-soft text-sm leading-relaxed">“{tagline}”</p>
          <div className="mt-3 text-[11px] font-bold tracking-widest uppercase text-cheeze-purple group-hover:text-cheeze-purple-deep transition-colors">
            Read more →
          </div>
        </div>
      </a>
    </InView>
  );
}

function ContactRow({ label, value, href }: { label: string; value: string; href: string }) {
  // `mailto:` 와 외부 링크는 다르게 처리 — mailto 에 `target="_blank"`
  // 를 붙이면 일부 브라우저가 빈 탭을 띄운 뒤 메일 클라이언트를 호출하는
  // 식으로 어색해짐. http(s) 만 새 탭으로.
  const isMail = href.startsWith("mailto:");
  const isExternal = href.startsWith("http");
  return (
    <div className="grid grid-cols-[6rem_1fr] gap-3 items-baseline pb-3 border-b border-cheeze-cream/15 group">
      <span className="text-[10px] tracking-[0.3em] uppercase text-cheeze-yellow/80">
        {label}
      </span>
      <a
        href={href}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noreferrer" : undefined}
        className="text-sm break-all underline decoration-cheeze-cream/25 underline-offset-[6px] hover:text-cheeze-yellow hover:decoration-cheeze-yellow transition-colors inline-flex items-center gap-1.5"
      >
        <span>{value}</span>
        <span
          aria-hidden
          className="text-[10px] opacity-50 group-hover:opacity-100 transition-opacity"
        >
          {isMail ? "✉" : "↗"}
        </span>
      </a>
    </div>
  );
}
