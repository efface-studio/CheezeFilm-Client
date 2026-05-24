import Image from "next/image";
import Link from "next/link";
import { getAllVideos } from "@/lib/youtube";
import { getContent, loadContentMap } from "@/lib/content";
import { getMembers } from "@/lib/members";
import { storageUrl } from "@/lib/db";
import { InView, StaggerText } from "@/components/Stagger";
import HeroCover from "@/components/HeroCover";
import CountUp from "@/components/CountUp";
import SiteNav from "@/components/SiteNav";
import SnapScroller from "@/components/SnapScroller";
import CareersReel from "@/components/CareersReel";
import { getCoverPhotos } from "@/lib/coverPhotos";

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
  const [
    { longform, shorts, subscriberCount, viewCount, totalCount },
    contentMap,
    members,
    coverPhotos,
  ] = await Promise.all([
    getAllVideos(),
    loadContentMap(),
    getMembers(),
    // Hero cover: prefer landscape group/cast photos from the Supabase
    // `covers` Storage bucket. Falls back to the 3 featured video
    // thumbnails configured in admin → "이번 호 표지" when empty.
    getCoverPhotos(),
  ]);
  const c = (key: string) => getContent(contentMap, key);

  // Live stats from the YouTube Data API (when the key is configured).
  // We normalize subscribers → M (millions, 2 decimals) and views → 억
  // (hundred-millions, 1 decimal) since those are the Korean
  // channel-card conventions. Fallbacks to the content-registry values
  // mean the page never shows a blank — admin edits still win when
  // they're set; otherwise we use the live API number.
  const liveSubscribersM =
    typeof subscriberCount === "number" ? subscriberCount / 1_000_000 : null;
  const liveViews억 =
    typeof viewCount === "number" ? viewCount / 100_000_000 : null;
  const liveVideoCount =
    typeof totalCount === "number"
      ? totalCount
      : longform.length + shorts.length;
  // Up to 10 pinned hero video slots; each falls back to the matching
  // longform position if the admin hasn't picked one. Empty strings are
  // stripped at the end so we never render a hole.
  const heroVideos = Array.from({ length: 10 }, (_, i) =>
    c(`works.${i + 1}.videoId`).trim() || longform[i]?.id || "",
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
                웹드라마 스튜디오
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
                  YouTube에서 보기
                  <span aria-hidden>↗</span>
                </a>
                <Link
                  href="/support"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-toss-50 text-cheeze-ink font-semibold text-[14px] hover:bg-toss-100 transition-colors"
                >
                  오디션 지원
                  <span aria-hidden>→</span>
                </Link>
              </div>
            </InView>
          </div>

          {/* Cover card with mask reveal — landscape photos win when present
              in /public/covers/, otherwise we cycle the 3 featured video
              thumbnails configured in admin. */}
          <aside className="lg:col-span-6 flex flex-col gap-4">
            <HeroCover photoSrcs={coverPhotos} videoIds={heroVideos} />
            {/* FILE · EDITION 02 caption removed — magazine masthead
                language doesn't fit the new clean surface. */}
          </aside>
        </div>

        {/* Stats strip — pulls live numbers from the YouTube Data API
            (`getAllVideos` now surfaces `subscriberCount`, `viewCount`,
            `totalCount`). When the API key is missing or the call
            fails, each Stat falls back to the matching content-key
            value the admin set in /admin → 콘텐츠. */}
        <div className="border-t border-cheeze-purple-deep/15">
          <div className="mx-auto max-w-[100rem] px-6 py-7 grid grid-cols-2 md:grid-cols-4 divide-x divide-cheeze-purple-deep/10">
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
        <div className="mx-auto max-w-[100rem] px-6 py-24 grid lg:grid-cols-12 gap-10">
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
              “스토리를 굽는 사람들의 작은 영화관.”
            </blockquote>
            <div className="mt-5 text-[11px] tracking-[0.3em] uppercase text-cheeze-olive">
              — Studio Cheeze, since 2017
            </div>
            {/* YouTube channel awards — single soft surface, hairline
                divider between cells, one bold label each. The earlier
                metallic-gradient chips read as loud; this version
                trusts the metal-coloured dots + clean typography. */}
            <div className="mt-10 rounded-2xl bg-toss-50 grid grid-cols-3 divide-x divide-toss-200/70">
              <AwardChip label="Silver" dotClass="bg-zinc-400" />
              <AwardChip label="Gold" dotClass="bg-amber-400" />
              <AwardChip label="대상" dotClass="bg-cheeze-purple" />
            </div>
          </InView>
        </div>
      </section>

      {/* ── CAST ──────────────────────────────────────
          Moved above the films block per user request — the cast
          spread is the primary identity moment, so it earns the
          first slot after the about/story intro. */}
      <section id="cast" className="border-b border-cheeze-purple-deep/15">
        <div className="mx-auto max-w-[100rem] px-6 py-24">
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
                카메라 앞과 뒤, 함께 굽는 사람들.
              </p>
            </InView>
            <Link
              href="/members"
              className="lg:col-span-3 lg:text-right text-sm font-bold tracking-widest uppercase text-cheeze-purple hover:text-cheeze-purple-deep mt-4 lg:mt-0"
            >
              전체 멤버 →
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
                        />
                      </div>
                      <div className="mt-3 px-1">
                        <div className="text-[15px] font-bold text-cheeze-ink tracking-tight truncate">
                          {m.name}
                        </div>
                        <div className="mt-0.5 text-[12px] text-cheeze-ink-soft truncate">
                          {m.roleLabel}
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
        <div className="mx-auto max-w-[100rem] px-6 py-24">
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
                채널을 정의한 세 편의 대표작, 그리고 매주 새로 굽고 있는 작품들까지.
              </p>
            </InView>
            <div className="lg:col-span-3 lg:text-right mt-4 lg:mt-0">
              <Link
                href="/videos"
                className="text-sm font-bold tracking-widest uppercase text-cheeze-purple hover:text-cheeze-purple-deep"
              >
                전체 영상 →
              </Link>
            </div>
          </div>

          {/* Featured (this issue's covers) — big cards, 3-up */}
          <div className="grid md:grid-cols-3 gap-x-6 gap-y-12">
            {heroVideos.slice(0, 3).map((vid, i) => (
              <FilmCard
                key={vid}
                videoId={vid}
                number={String(i + 1).padStart(2, "0")}
                title={["다중인격 소녀", "남자무리 여사친", "달고나"][i] ?? ""}
                year={["Series", "2020 · Anthology", "2020 · 4-part"][i] ?? ""}
                tagline={
                  [
                    "사투리, 그리고 네 개의 인격.",
                    "남자들 사이의 단 한 명, 여사친.",
                    "달콤하고, 한 번에 깨지는 청춘.",
                  ][i] ?? ""
                }
                delay={i * 120}
              />
            ))}
          </div>

          {/* Recent uploads — used to be its own "방금 업로드된" section.
              Now lives here as a secondary row under the featured films.
              Skips any video already shown as a featured cover to avoid
              repeating the same thumbnail twice. */}
          {(() => {
            const featuredIds = new Set(heroVideos);
            const recent = longform
              .filter((v) => !featuredIds.has(v.id))
              .slice(0, 6);
            if (recent.length === 0) return null;
            return (
              <div className="mt-20 pt-12 border-t border-cheeze-purple-deep/15">
                <InView className="fade-up flex items-baseline justify-between gap-6 mb-8">
                  <div>
                    <div className="text-[10px] tracking-[0.4em] uppercase text-cheeze-olive">
                      — Just dropped
                    </div>
                    <h3
                      className="mt-2 text-2xl md:text-3xl tracking-tight"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      방금 업로드된.
                    </h3>
                  </div>
                  <Link
                    href="/videos"
                    className="text-[11px] tracking-widest uppercase font-bold text-cheeze-purple-deep hover:text-cheeze-purple border-b border-cheeze-purple-deep/30 hover:border-cheeze-purple pb-1 transition-colors whitespace-nowrap"
                  >
                    전체 필모 →
                  </Link>
                </InView>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
                  {recent.map((v, i) => (
                    <InView
                      key={v.id}
                      className="fade-up"
                      style={
                        {
                          transitionDelay: `${(i % 3) * 60}ms`,
                        } as React.CSSProperties
                      }
                    >
                      <a
                        href={v.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group block film"
                      >
                        <div className="aspect-[16/10] relative overflow-hidden bg-cheeze-charcoal">
                          <Image
                            src={v.thumbnail}
                            alt={v.title}
                            fill
                            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                            quality={85}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-cheeze-charcoal/60 via-transparent to-transparent" />
                          {i === 0 && (
                            <span className="absolute top-3 left-3 bg-cheeze-yellow text-cheeze-purple-deep text-[9px] font-bold tracking-widest uppercase px-2 py-1">
                              New
                            </span>
                          )}
                          <span className="absolute bottom-3 right-3 bg-cheeze-charcoal/85 text-cheeze-cream text-[10px] font-mono tracking-wider px-2 py-1">
                            {new Date(v.publishedAt).toLocaleDateString(
                              "ko-KR",
                              { month: "2-digit", day: "2-digit" },
                            )}
                          </span>
                        </div>
                        <h4 className="mt-3 text-[15px] font-bold leading-snug text-cheeze-ink line-clamp-2 group-hover:text-cheeze-purple transition-colors">
                          {v.title}
                        </h4>
                        <div className="mt-1 text-[10px] tracking-widest uppercase text-cheeze-olive">
                          {new Date(v.publishedAt).toLocaleDateString("ko-KR", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </div>
                      </a>
                    </InView>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* ── SHORTS strip ─────────────────────────────── */}
      {/* `data-nav-section="films"` makes SiteNav treat this section as a
          continuation of #films for scroll-spy purposes — so "02 영상" stays
          lit while the user is reading shorts. */}
      {shorts.length > 0 && (
        <section
          data-nav-section="films"
          className="border-b border-cheeze-purple-deep/15"
        >
          <div className="mx-auto max-w-[100rem] px-6 py-20">
            <div className="flex items-baseline justify-between mb-8">
              <InView className="fade-up">
                <div className="text-[10px] tracking-[0.4em] uppercase text-cheeze-olive">— Section 03</div>
                <h2
                  className="mt-2 text-3xl md:text-4xl tracking-tight"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Shorts <span className="text-cheeze-purple">/</span> 한 입.
                </h2>
              </InView>
              <Link
                href="/videos?kind=shorts"
                className="text-sm font-bold tracking-widest uppercase text-cheeze-purple hover:text-cheeze-purple-deep"
              >
                전체 쇼츠 →
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
      )}

      {/* ── CAREERS teaser ──────────────────────────── */}
      {/* Compact preview of the full careers page so users don't have to
          click through to get the gist. Shows: heading, the reel, and the
          top 4 role chips (actor leads — that's the open audition focus).
          Full details + email CTA live on /careers. */}
      <section id="careers" className="border-b border-cheeze-purple-deep/15">
        <div className="mx-auto max-w-[100rem] px-6 py-24 grid lg:grid-cols-12 gap-x-10 gap-y-12">
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
                <span className="text-cheeze-purple">주연배우</span>를 비롯해,
                <br />
                함께 한 컷을 구울 사람.
              </h2>
              <p className="mt-6 max-w-xl text-cheeze-ink-soft leading-relaxed">
                치즈필름 신작의 얼굴이 될 배우를 1순위로, 작가·연출·촬영·편집까지
                결을 맞춰 오래 함께할 사람을 찾고 있습니다.
              </p>
            </InView>

            <InView className="fade-up mt-8">
              <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-5">
                {[
                  {
                    num: "01",
                    title: "배우 (주연/조연)",
                    desc: "신작의 얼굴. 10~30분 단편 안에서 인물을 진짜처럼 살려낼 분.",
                  },
                  {
                    num: "02",
                    title: "작가",
                    desc: "매주 한 편씩 단편을 굽는 작가. 청춘 드라마 톤을 이해하는 분.",
                  },
                  {
                    num: "03",
                    title: "연출",
                    desc: "한 회차 안에서 인물의 작은 변화를 카메라로 잡아내는 분.",
                  },
                  {
                    num: "04",
                    title: "촬영 · 편집",
                    desc: "빛·구도·컷 — 한 컷의 결을 책임지는 사람.",
                  },
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
                            1순위
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
                전체 채용 정보
                <span aria-hidden>→</span>
              </Link>
              <Link
                href="/support?tab=audition"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-toss-50 text-cheeze-ink text-[14px] font-semibold hover:bg-toss-100 transition-colors"
              >
                지원하기
                <span aria-hidden>→</span>
              </Link>
            </InView>
          </div>

          {/* Right column — autoplaying reel */}
          <InView className="fade-up lg:col-span-4 lg:border-l lg:border-cheeze-purple-deep/15 lg:pl-8">
            <div className="text-[10px] tracking-[0.3em] uppercase text-cheeze-olive mb-3 flex items-center gap-2">
              <span className="pulse-dot" /> Audition reel
            </div>
            <CareersReel
              src="/reels/DQ_oNK3EW_w.mp4"
              label="치즈필름 주연배우 공개 오디션 릴스"
            />
            <a
              href="https://www.instagram.com/p/DQ_oNK3EW_w/"
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-[11px] tracking-[0.25em] uppercase text-cheeze-purple hover:text-cheeze-purple-deep"
            >
              Instagram에서 원본 보기 ↗
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
        <div className="mx-auto max-w-[100rem] px-6 py-24 grid lg:grid-cols-12 gap-10 items-end">
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
export function SiteHeader() {
  return <SiteNav />;
}

export async function SiteFooter({ isHome = false }: { isHome?: boolean } = {}) {
  const year = new Date().getFullYear();
  const contentMap = await loadContentMap();
  const c = (key: string) => getContent(contentMap, key);
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
                치즈필름
              </div>
              <div className="mt-1 text-[10px] tracking-[0.35em] uppercase text-cheeze-cream/55">
                CheezeFilm · Editorial 02
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
              aria-label="YouTube — 새 탭에서 열기"
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
              aria-label="Instagram — 새 탭에서 열기"
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
            바로가기
          </h4>
          <ul className="mt-5 space-y-2.5 text-sm">
            <li>
              <Link
                href="/#issue"
                className="text-cheeze-cream/80 hover:text-cheeze-yellow transition-colors"
              >
                소개
              </Link>
            </li>
            <li>
              <Link
                href="/videos"
                className="text-cheeze-cream/80 hover:text-cheeze-yellow transition-colors"
              >
                영상
              </Link>
            </li>
            <li>
              <Link
                href="/members"
                className="text-cheeze-cream/80 hover:text-cheeze-yellow transition-colors"
              >
                멤버
              </Link>
            </li>
            <li>
              <Link
                href="/support"
                className="text-cheeze-cream/80 hover:text-cheeze-yellow transition-colors"
              >
                오디션 지원
              </Link>
            </li>
            <li>
              <Link
                href="/support?tab=fan"
                className="text-cheeze-cream/80 hover:text-cheeze-yellow transition-colors"
              >
                응원 메시지
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
          <CompanyStrip contentMap={contentMap} />
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
function CompanyStrip({ contentMap }: { contentMap: Map<string, string> }) {
  const c = (key: string) => getContent(contentMap, key);
  const items = [
    { label: "상호", value: c("company.name") },
    { label: "대표", value: c("company.ceo") },
    { label: "사업자등록번호", value: c("company.business_no") },
    { label: "통신판매업신고", value: c("company.commerce_no") },
    { label: "직업정보제공사업", value: c("company.job_info_no") },
    { label: "MCN", value: c("company.network") },
    { label: "주소", value: c("company.address") },
    { label: "고객센터", value: c("company.phone") },
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
    <InView className="fade-up px-4 first:pl-0">
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
    <div className="px-3 py-4 flex items-center justify-center gap-2">
      <span aria-hidden className={`block w-2 h-2 rounded-full ${dotClass}`} />
      <span className="text-[13px] font-bold tracking-tight text-cheeze-ink">
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
