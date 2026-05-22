import Link from "next/link";
import { getAllVideos } from "@/lib/youtube";
import { getContent } from "@/lib/content";
import { members } from "@/lib/members";
import { InView, StaggerText } from "@/components/Stagger";
import CountUp from "@/components/CountUp";

export const revalidate = 3600;
export const metadata = {
  title: "치즈필름 02 | Editorial",
  description: "모던 에디토리얼 무드의 치즈필름.",
};

export default async function HomeV2() {
  const { longform, shorts } = await getAllVideos();
  const c = (key: string) => getContent(key);
  const heroVideos = [
    c("works.1.videoId").trim() || longform[0]?.id || "",
    c("works.2.videoId").trim() || longform[1]?.id || "",
    c("works.3.videoId").trim() || longform[2]?.id || "",
  ].filter(Boolean);

  return (
    <main className="min-h-screen bg-cheeze-cream text-cheeze-ink editorial">
      <V2Header />

      {/* ── HERO ──────────────────────────────────────── */}
      <section className="border-b border-cheeze-purple-deep/15 overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 pt-16 pb-20 grid lg:grid-cols-12 gap-x-10 gap-y-12">
          {/* Issue rail */}
          <aside className="lg:col-span-2 flex lg:flex-col items-start lg:items-stretch justify-between gap-3 lg:pr-6">
            <InView className="v2-fade-up">
              <div className="text-[10px] tracking-[0.4em] uppercase text-cheeze-olive">
                Issue
              </div>
              <div
                className="text-[5rem] leading-none mt-2 text-cheeze-purple"
                style={{ fontFamily: "var(--font-display)" }}
              >
                <CountUp value={2} fallback="02" duration={1100} suffix="" />
                <span aria-hidden style={{ marginLeft: "-0.45em" }}>2</span>
              </div>
              <div className="text-[10px] tracking-[0.3em] uppercase text-cheeze-olive mt-2">
                Spring · 2026
              </div>
            </InView>
            <InView as="span" className="v2-vrule hidden lg:block flex-1 mt-6" />
          </aside>

          {/* Hero copy */}
          <div className="lg:col-span-7">
            <InView className="v2-fade-up">
              <div className="text-[11px] tracking-[0.45em] uppercase text-cheeze-purple font-mono mb-6 flex items-center gap-2">
                <span className="v2-pulse-dot" /> A K-WEB-DRAMA STUDIO
              </div>
            </InView>
            <InView
              as="h1"
              className="v2-stagger v2-title leading-[0.92] tracking-[-0.02em]"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(2.8rem, 7.5vw, 6rem)",
              }}
            >
              <StaggerText text={c("hero.title.line1")} />
              <br />
              <span className="text-cheeze-purple">
                <StaggerText text={c("hero.title.line2")} />
              </span>
            </InView>
            <InView className="v2-fade-up" rootMargin="0px 0px -5% 0px">
              <p
                className="mt-10 max-w-xl text-base sm:text-lg leading-relaxed text-cheeze-ink-soft whitespace-pre-line"
                style={{ transitionDelay: "300ms" }}
              >
                {c("hero.subtitle")}
              </p>
              <div
                className="mt-10 flex flex-wrap gap-3"
                style={{ transitionDelay: "450ms" }}
              >
                <a
                  href="https://www.youtube.com/@CheezeFilmz"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-bold tracking-widest uppercase px-5 py-3 bg-cheeze-purple-deep text-cheeze-yellow hover:bg-cheeze-purple transition-colors"
                >
                  ▸ Watch on YouTube
                </a>
                <Link
                  href="/v2/support"
                  className="text-sm font-bold tracking-widest uppercase px-5 py-3 border border-cheeze-purple-deep text-cheeze-purple-deep hover:bg-cheeze-purple-deep hover:text-cheeze-yellow transition-colors"
                >
                  Audition →
                </Link>
              </div>
            </InView>
          </div>

          {/* Cover card with mask reveal */}
          <aside className="lg:col-span-3 flex flex-col gap-4">
            {heroVideos[0] && (
              <a
                href={`https://www.youtube.com/watch?v=${heroVideos[0]}`}
                target="_blank"
                rel="noreferrer"
                className="group block v2-film"
              >
                <InView className="v2-mask aspect-[3/4] relative bg-cheeze-charcoal">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://i.ytimg.com/vi/${heroVideos[0]}/maxresdefault.jpg`}
                    alt="Featured film"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-cheeze-charcoal/85 via-cheeze-charcoal/0 to-cheeze-charcoal/30" />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <div className="text-[10px] tracking-[0.4em] uppercase text-cheeze-yellow/90 mb-2">
                      Now Featured · Cover
                    </div>
                    <div
                      className="text-cheeze-cream text-2xl leading-tight"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      이번 호의 한 컷.
                    </div>
                  </div>
                </InView>
              </a>
            )}
            <InView className="v2-fade-up text-[10px] tracking-[0.3em] uppercase text-cheeze-olive flex justify-between">
              <span>FILE</span>
              <span>EDITION 02</span>
            </InView>
          </aside>
        </div>

        {/* Stats strip */}
        <div className="border-t border-cheeze-purple-deep/15">
          <div className="mx-auto max-w-7xl px-6 py-7 grid grid-cols-2 md:grid-cols-4 divide-x divide-cheeze-purple-deep/10">
            <Stat label={c("stats.subscribers.label")} value={3.32} suffix={c("stats.subscribers.suffix")} fallback={`${c("stats.subscribers")}${c("stats.subscribers.suffix")}`} decimals={2} />
            <Stat label={c("stats.videos.label")} value={503} suffix={c("stats.videos.suffix")} fallback={`${c("stats.videos")}${c("stats.videos.suffix")}`} />
            <Stat label={c("stats.views.label")} value={13.8} suffix={c("stats.views.suffix")} fallback={`${c("stats.views")}${c("stats.views.suffix")}`} decimals={1} />
            <Stat label={c("stats.year.label")} value={2017} fallback={c("stats.year")} />
          </div>
        </div>
      </section>

      {/* ── MARQUEE ──────────────────────────────────── */}
      <div className="border-b border-cheeze-purple-deep/15 v2-marquee-stage overflow-hidden">
        <div className="v2-marquee py-4 text-cheeze-purple-deep tracking-[0.3em] uppercase text-sm">
          {Array.from({ length: 2 }).map((_, k) => (
            <span key={k} className="inline-flex items-center gap-12 px-6">
              <span>Studio Cheeze</span>
              <span className="text-cheeze-olive">/</span>
              <span>치즈필름</span>
              <span className="text-cheeze-olive">/</span>
              <span>Web Drama Since 2017</span>
              <span className="text-cheeze-olive">/</span>
              <span>Sandbox Network Partner</span>
              <span className="text-cheeze-olive">/</span>
              <span>{c("stats.subscribers")}{c("stats.subscribers.suffix")} subscribers</span>
              <span className="text-cheeze-olive">/</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── STORY ───────────────────────────────────── */}
      <section id="issue" className="border-b border-cheeze-purple-deep/15">
        <div className="mx-auto max-w-7xl px-6 py-24 grid lg:grid-cols-12 gap-10">
          <InView as="aside" className="v2-fade-up lg:col-span-2">
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
              className="v2-title v2-fade-up text-4xl md:text-5xl tracking-tight leading-[1.05]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {c("story.heading.before")}{" "}
              <span className="text-cheeze-purple">
                {c("story.heading.brand")}
              </span>{" "}
              {c("story.heading.after")}
            </InView>
            <InView className="v2-fade-up mt-6 space-y-5 text-cheeze-ink-soft leading-relaxed text-[15px]">
              <p>{c("story.paragraph1")}</p>
              <p>{c("story.paragraph2")}</p>
            </InView>
          </div>
          <InView as="aside" className="v2-fade-up lg:col-span-4 lg:border-l lg:border-cheeze-purple-deep/15 lg:pl-8">
            <blockquote
              className="text-2xl md:text-3xl leading-snug text-cheeze-purple-deep"
              style={{ fontFamily: "var(--font-display)" }}
            >
              “스토리를 굽는 사람들의 작은 영화관.”
            </blockquote>
            <div className="mt-5 text-[11px] tracking-[0.3em] uppercase text-cheeze-olive">
              — Studio Cheeze, since 2017
            </div>
            <div className="mt-10 grid grid-cols-3 gap-2 text-[10px] tracking-[0.25em] uppercase text-cheeze-purple-deep">
              <span className="border border-cheeze-purple-deep/30 px-2 py-1.5 text-center">Silver</span>
              <span className="border border-cheeze-purple-deep/30 px-2 py-1.5 text-center">Gold</span>
              <span className="border border-cheeze-purple-deep/30 px-2 py-1.5 text-center">대상</span>
            </div>
          </InView>
        </div>
      </section>

      {/* ── FILMS ───────────────────────────────────── */}
      <section id="films" className="border-b border-cheeze-purple-deep/15">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="grid lg:grid-cols-12 mb-12 items-end">
            <InView className="v2-fade-up lg:col-span-2">
              <div className="text-[10px] tracking-[0.4em] uppercase text-cheeze-olive">— Section 02</div>
              <div
                className="mt-3 text-[3rem] leading-none text-cheeze-purple"
                style={{ fontFamily: "var(--font-display)" }}
              >
                02
              </div>
            </InView>
            <InView as="div" className="v2-fade-up v2-title lg:col-span-7">
              <h2
                className="text-4xl md:text-5xl tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Filmography.
              </h2>
              <p className="mt-3 text-cheeze-ink-soft">
                채널을 정의한 세 편의 작품, 그리고 매주 굽고 있는 것들.
              </p>
            </InView>
            <div className="lg:col-span-3 lg:text-right mt-4 lg:mt-0">
              <Link
                href="/v2/videos"
                className="text-sm font-bold tracking-widest uppercase text-cheeze-purple hover:text-cheeze-purple-deep"
              >
                전체 영상 →
              </Link>
            </div>
          </div>

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
        </div>
      </section>

      {/* ── SHORTS strip ─────────────────────────────── */}
      {shorts.length > 0 && (
        <section className="border-b border-cheeze-purple-deep/15">
          <div className="mx-auto max-w-7xl px-6 py-20">
            <div className="flex items-baseline justify-between mb-8">
              <InView className="v2-fade-up">
                <div className="text-[10px] tracking-[0.4em] uppercase text-cheeze-olive">— Section 03</div>
                <h2
                  className="mt-2 text-3xl md:text-4xl tracking-tight"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Shorts <span className="text-cheeze-purple">/</span> 한 입.
                </h2>
              </InView>
              <Link
                href="/v2/videos?kind=shorts"
                className="text-sm font-bold tracking-widest uppercase text-cheeze-purple hover:text-cheeze-purple-deep"
              >
                전체 쇼츠 →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {shorts.slice(0, 12).map((v, i) => (
                <InView
                  key={v.id}
                  className="v2-fade-up"
                  style={{ transitionDelay: `${i * 50}ms` } as React.CSSProperties}
                >
                  <a
                    href={v.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group block aspect-[9/16] overflow-hidden bg-cheeze-charcoal relative v2-film"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={v.thumbnail}
                      alt={v.title}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover"
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

      {/* ── CAST ────────────────────────────────────── */}
      <section id="cast" className="border-b border-cheeze-purple-deep/15">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="grid lg:grid-cols-12 mb-12 items-end">
            <InView className="v2-fade-up lg:col-span-2">
              <div className="text-[10px] tracking-[0.4em] uppercase text-cheeze-olive">— Section 04</div>
              <div
                className="mt-3 text-[3rem] leading-none text-cheeze-purple"
                style={{ fontFamily: "var(--font-display)" }}
              >
                03
              </div>
            </InView>
            <InView className="v2-fade-up v2-title lg:col-span-7">
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
              href="/v2/members"
              className="lg:col-span-3 lg:text-right text-sm font-bold tracking-widest uppercase text-cheeze-purple hover:text-cheeze-purple-deep mt-4 lg:mt-0"
            >
              전체 멤버 →
            </Link>
          </div>

          <ol className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3">
            {members.slice(0, 6).map((m, i) => (
              <InView
                key={m.slug}
                as="li"
                className="v2-fade-up grid grid-cols-[auto_1fr_auto] items-baseline gap-3 py-4 border-t border-cheeze-purple-deep/15"
                style={{ transitionDelay: `${i * 60}ms` } as React.CSSProperties}
              >
                <span
                  className="text-cheeze-olive font-mono text-sm tabular-nums"
                  style={{ minWidth: "2.5rem" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>
                  <span className="text-2xl" style={{ fontFamily: "var(--font-display)" }}>
                    {m.name}
                  </span>
                  <span className="ml-2 text-xs uppercase tracking-widest text-cheeze-olive">
                    {m.nameEn}
                  </span>
                  <span className="block text-sm text-cheeze-ink-soft mt-1">
                    “{m.highlight}”
                  </span>
                </span>
                <span className="text-[10px] tracking-[0.25em] uppercase text-cheeze-purple">
                  {m.roleLabel}
                </span>
              </InView>
            ))}
          </ol>
        </div>
      </section>

      {/* ── CTA / CONTACT ──────────────────────────── */}
      <section id="contact" className="bg-cheeze-purple-deep text-cheeze-cream">
        <div className="mx-auto max-w-7xl px-6 py-24 grid lg:grid-cols-12 gap-10 items-end">
          <InView className="v2-fade-up lg:col-span-7">
            <div className="text-[10px] tracking-[0.4em] uppercase text-cheeze-yellow flex items-center gap-2">
              <span className="v2-pulse-dot" /> Section 05 · Take part
            </div>
            <h2
              className="mt-5 text-5xl md:text-6xl tracking-tight leading-[1] text-cheeze-yellow v2-title"
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
                href="/v2/support?tab=audition"
                className="text-sm font-bold tracking-widest uppercase px-5 py-3 bg-cheeze-yellow text-cheeze-purple-deep hover:bg-cheeze-cream transition-colors"
              >
                Audition →
              </Link>
              <Link
                href="/v2/support?tab=fan"
                className="text-sm font-bold tracking-widest uppercase px-5 py-3 border border-cheeze-yellow text-cheeze-yellow hover:bg-cheeze-yellow hover:text-cheeze-purple-deep transition-colors"
              >
                Fan Letter →
              </Link>
            </div>
          </InView>
          <InView className="v2-fade-up lg:col-span-5 lg:border-l lg:border-cheeze-cream/15 lg:pl-10 space-y-6">
            <ContactRow label="Business" value={c("contact.business")} href={`mailto:${c("contact.business")}`} />
            <ContactRow label="Audition" value={c("contact.audition")} href={`mailto:${c("contact.audition")}`} />
            <ContactRow label="YouTube" value="@CheezeFilmz" href="https://www.youtube.com/@CheezeFilmz" />
            <ContactRow label="Instagram" value="@cheezefilm.official" href="https://www.instagram.com/cheezefilm.official/" />
          </InView>
        </div>
      </section>

      <V2Footer />
    </main>
  );
}

// ─── Shared V2 components ────────────────────────────

export function V2Header() {
  return (
    <header className="border-b border-cheeze-purple-deep/15 sticky top-0 z-40 bg-cheeze-cream/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
        <Link href="/v2" className="flex items-center gap-3 group">
          <span className="inline-flex w-9 h-9 rounded-full bg-cheeze-purple overflow-hidden border border-cheeze-purple-deep">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/cheeze-logo.png" alt="CheezeFilm" className="w-full h-full object-cover" />
          </span>
          <span className="hidden sm:flex flex-col leading-none">
            <span className="font-bold text-sm tracking-tight">치즈필름</span>
            <span className="text-[10px] tracking-[0.3em] text-cheeze-olive uppercase">
              Editorial · 02
            </span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-sm">
          <Link href="/v2#issue" className="hover:text-cheeze-purple transition-colors">이슈</Link>
          <Link href="/v2/videos" className="hover:text-cheeze-purple transition-colors">필모</Link>
          <Link href="/v2/members" className="hover:text-cheeze-purple transition-colors">캐스트</Link>
          <Link href="/v2#contact" className="hover:text-cheeze-purple transition-colors">접촉</Link>
        </nav>

        <div className="flex items-center gap-3 text-xs">
          <Link
            href="/"
            className="text-cheeze-olive hover:text-cheeze-purple tracking-widest uppercase transition-colors"
          >
            ← 디자인 바꾸기
          </Link>
          <Link
            href="/v2/support"
            className="px-3.5 py-2 bg-cheeze-purple-deep text-cheeze-yellow text-[11px] tracking-widest uppercase font-bold hover:bg-cheeze-purple transition-colors"
          >
            지원
          </Link>
        </div>
      </div>
    </header>
  );
}

export function V2Footer() {
  return (
    <footer className="bg-cheeze-cream border-t border-cheeze-purple-deep/15">
      <div className="mx-auto max-w-7xl px-6 py-10 grid md:grid-cols-3 gap-6 text-xs text-cheeze-ink-soft">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex w-7 h-7 rounded-full overflow-hidden bg-cheeze-purple">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/cheeze-logo.png" alt="" className="w-full h-full object-cover" />
          </span>
          <span className="font-bold tracking-widest uppercase">
            CheezeFilm · Editorial 02
          </span>
        </div>
        <div className="text-cheeze-olive">
          © {new Date().getFullYear()} (주)스튜디오 치즈. All rights reserved.
        </div>
        <div className="flex md:justify-end items-center gap-2">
          <span className="opacity-60">Crafted by</span>
          <a
            href="https://efface.dev"
            target="_blank"
            rel="noreferrer"
            className="font-bold text-cheeze-purple hover:text-cheeze-purple-deep"
          >
            efface · efface.dev ↗
          </a>
        </div>
      </div>
    </footer>
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
    <InView className="v2-fade-up px-4 first:pl-0">
      <div
        className="text-3xl md:text-4xl text-cheeze-purple-deep tabular-nums"
        style={{ fontFamily: "var(--font-display)" }}
      >
        <CountUp value={value} suffix={suffix} fallback={fallback} decimals={decimals} duration={1400} />
      </div>
      <div className="mt-1 text-[10px] tracking-[0.3em] uppercase text-cheeze-olive">
        {label}
      </div>
    </InView>
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
      className="v2-fade-up"
      style={{ transitionDelay: `${delay}ms` } as React.CSSProperties}
    >
      <a
        href={videoId ? `https://www.youtube.com/watch?v=${videoId}` : "https://www.youtube.com/@CheezeFilmz/videos"}
        target="_blank"
        rel="noreferrer"
        className="group block v2-film"
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
          <div className="v2-film__hint">
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
  return (
    <div className="grid grid-cols-[6rem_1fr] gap-3 items-baseline pb-3 border-b border-cheeze-cream/15">
      <span className="text-[10px] tracking-[0.3em] uppercase text-cheeze-yellow/80">{label}</span>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="text-sm break-all hover:text-cheeze-yellow transition-colors"
      >
        {value}
      </a>
    </div>
  );
}
