import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import Reveal from "@/components/Reveal";
import CountUp from "@/components/CountUp";
import CountdownLeader from "@/components/CountdownLeader";
import Typewriter from "@/components/Typewriter";
import TiltCard from "@/components/TiltCard";
import { getAllVideos } from "@/lib/youtube";
import { getContent } from "@/lib/content";

export const revalidate = 3600;

const works = [
  {
    title: "다중인격 소녀",
    year: "시리즈",
    tagline: "사투리, 그리고 네 개의 인격.",
    badge: "대표작",
    note: "조채윤(조아영)의 다인격 연기로 채널 팬덤을 만든 시리즈.",
    accent: "bg-cheeze-purple",
    numColor: "text-cheeze-yellow",
  },
  {
    title: "남자무리 여사친",
    year: "2020 · 단편선",
    tagline: "남자들 사이의 단 한 명, 여사친.",
    badge: "히트작",
    note: "“공감 시리즈”로 채널 정체성을 굳힌 단편.",
    accent: "bg-cheeze-yellow",
    numColor: "text-cheeze-purple-deep",
  },
  {
    title: "달고나",
    year: "2020 · 4부작",
    tagline: "이름처럼 달콤하고, 한 번에 깨지는 청춘.",
    badge: "단편 드라마",
    note: "김기해 주연. 짧지만 강한 여운의 4부작.",
    accent: "bg-cheeze-charcoal",
    numColor: "text-cheeze-yellow",
  },
];

function parseStatValue(raw: string): { num: number; decimals: number } {
  const n = Number(raw);
  if (!Number.isFinite(n)) return { num: 0, decimals: 0 };
  const dot = raw.indexOf(".");
  return { num: n, decimals: dot >= 0 ? raw.length - dot - 1 : 0 };
}

export default async function Home() {
  const { longform, shorts, source: videoSource } = await getAllVideos();
  const recentLongform = longform.slice(0, 8);
  const recentShorts = shorts.slice(0, 12);

  // All site copy reads from the editable content store
  const c = (key: string) => getContent(key);

  // Each work card pulls its thumbnail from a YouTube videoId. Admins can
  // override per-card via the content tab; if blank, fall back to the latest
  // longform videos from the channel feed so the section is never empty.
  const workVideoIds = [
    c("works.1.videoId").trim() || longform[0]?.id || "",
    c("works.2.videoId").trim() || longform[1]?.id || "",
    c("works.3.videoId").trim() || longform[2]?.id || "",
  ];
  const worksWithThumbs = works.map((w, i) => ({
    ...w,
    videoId: workVideoIds[i],
  }));
  const subs = parseStatValue(c("stats.subscribers"));
  const vids = parseStatValue(c("stats.videos"));
  const views = parseStatValue(c("stats.views"));
  const year = parseStatValue(c("stats.year"));
  const stats = [
    {
      ...subs,
      suffix: c("stats.subscribers.suffix"),
      fallback: c("stats.subscribers") + c("stats.subscribers.suffix"),
      label: c("stats.subscribers.label"),
    },
    {
      ...vids,
      suffix: c("stats.videos.suffix"),
      fallback: c("stats.videos") + c("stats.videos.suffix"),
      label: c("stats.videos.label"),
    },
    {
      ...views,
      suffix: c("stats.views.suffix"),
      fallback: c("stats.views") + c("stats.views.suffix"),
      label: c("stats.views.label"),
    },
    {
      ...year,
      suffix: "",
      fallback: c("stats.year"),
      label: c("stats.year.label"),
    },
  ];

  return (
    <>
      <CountdownLeader />
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden border-b-2 border-cheeze-ink">
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(1200px 500px at 80% -10%, rgba(85,34,163,0.55), transparent 60%), radial-gradient(900px 500px at 0% 110%, rgba(250,190,75,0.3), transparent 60%)",
          }}
        />
        <div className="mx-auto max-w-6xl px-5 pt-10 sm:pt-16 pb-16 sm:pb-20 grid lg:grid-cols-[1.4fr_1fr] gap-10 lg:gap-12 items-end">
          <div>
            <span className="tape text-xs sm:text-sm">{c("hero.tape")}</span>
            <h1
              className="mt-5 sm:mt-6 leading-[0.95] text-cheeze-ink"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(2.5rem, 8vw, 6.5rem)",
              }}
            >
              <Typewriter
                lines={[
                  { text: c("hero.title.line1") },
                  { text: c("hero.title.line2"), className: "text-cheeze-purple" },
                ]}
                charDelay={75}
                linePause={180}
              />
            </h1>
            <p className="mt-5 sm:mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-cheeze-ink-soft whitespace-pre-line">
              {c("hero.subtitle")}
            </p>
            <div className="mt-6 sm:mt-8 flex flex-wrap items-center gap-3">
              <Link href="/support" className="btn-yellow">
                ★ 지원하기
              </Link>
              <a
                href="https://www.youtube.com/@CheezeFilmz"
                target="_blank"
                rel="noreferrer"
                className="btn-ghost"
              >
                ▶ 유튜브 채널
              </a>
              <span className="text-xs sm:text-sm text-cheeze-olive sm:ml-2">
                {c("hero.byline")}
              </span>
            </div>

            {/* Mobile / tablet-only hero visual */}
            <div className="lg:hidden mt-8 flex justify-center gap-3 flex-wrap">
              <div
                className="sway w-32 h-40 bg-white border-2 border-cheeze-purple-deep shadow-[4px_4px_0_var(--cheeze-purple-deep)]"
                style={
                  {
                    "--sway-rest": "-5deg",
                    "--sway-amp": "2deg",
                  } as React.CSSProperties
                }
              >
                <div className="h-28 bg-cheeze-purple grid place-items-center text-4xl text-cheeze-yellow">
                  🧀
                </div>
                <div
                  className="text-center mt-1 text-xs"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  CHEEZE!
                </div>
              </div>
              <div
                className="sway w-32 h-40 bg-white border-2 border-cheeze-purple-deep shadow-[4px_4px_0_var(--cheeze-purple-deep)]"
                style={
                  {
                    "--sway-rest": "4deg",
                    "--sway-amp": "-1.5deg",
                    "--sway-delay": "1.5s",
                  } as React.CSSProperties
                }
              >
                <div className="h-28 bg-cheeze-charcoal grid place-items-center text-4xl text-cheeze-yellow">
                  🎬
                </div>
                <div
                  className="text-center mt-1 text-xs"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  ACTION!
                </div>
              </div>
            </div>
          </div>

          <div className="relative h-[360px] hidden lg:block">
            <div
              className="sway absolute right-10 top-2 w-56 h-72 bg-white border-2 border-cheeze-purple-deep shadow-[8px_8px_0_var(--cheeze-purple-deep)]"
              style={
                {
                  "--sway-rest": "-7deg",
                  "--sway-amp": "2deg",
                  "--sway-delay": "0s",
                } as React.CSSProperties
              }
            >
              <div className="h-52 bg-cheeze-purple flex items-center justify-center text-6xl text-cheeze-yellow">
                🧀
              </div>
              <div
                className="text-center mt-3 text-sm"
                style={{ fontFamily: "var(--font-display)" }}
              >
                CHEEZE!
              </div>
            </div>
            <div
              className="sway absolute right-44 top-24 w-56 h-72 bg-white border-2 border-cheeze-purple-deep shadow-[8px_8px_0_var(--cheeze-purple-deep)]"
              style={
                {
                  "--sway-rest": "5deg",
                  "--sway-amp": "-1.7deg",
                  "--sway-delay": "1.4s",
                } as React.CSSProperties
              }
            >
              <div className="h-52 bg-cheeze-wine flex items-center justify-center text-5xl text-cheeze-cream">
                🎬
              </div>
              <div
                className="text-center mt-3 text-sm"
                style={{ fontFamily: "var(--font-display)" }}
              >
                ACTION!
              </div>
            </div>
            <div
              className="sway absolute right-2 bottom-0 w-56 h-72 bg-white border-2 border-cheeze-purple-deep shadow-[8px_8px_0_var(--cheeze-purple-deep)]"
              style={
                {
                  "--sway-rest": "2deg",
                  "--sway-amp": "1.4deg",
                  "--sway-delay": "2.8s",
                } as React.CSSProperties
              }
            >
              <div className="h-52 bg-cheeze-charcoal flex items-center justify-center text-5xl">
                <span className="text-cheeze-yellow">●</span>
                <span className="text-cheeze-cream mx-2">REC</span>
              </div>
              <div
                className="text-center mt-3 text-sm"
                style={{ fontFamily: "var(--font-display)" }}
              >
                ROLL TAPE
              </div>
            </div>
          </div>
        </div>

        <div className="border-t-2 border-cheeze-purple-deep bg-cheeze-purple text-cheeze-cream">
          <div className="mx-auto max-w-6xl px-5 py-5 grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s, i) => (
              <Reveal
                key={s.label}
                className="reveal flex items-baseline gap-3"
                delay={i * 120}
              >
                <span
                  className="text-cheeze-yellow text-3xl md:text-4xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  <CountUp
                    value={s.num}
                    decimals={s.decimals}
                    suffix={s.suffix}
                    fallback={s.fallback}
                    duration={1400}
                  />
                </span>
                <span className="text-xs uppercase tracking-[0.25em] text-cheeze-cream/80">
                  {s.label}
                </span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* MARQUEE — yellow on purple, matching the channel's actual look. Hover pauses. */}
      <div className="marquee-stage overflow-hidden bg-cheeze-yellow border-y-2 border-cheeze-purple-deep">
        <div className="marquee-track py-3 text-cheeze-purple-deep font-bold uppercase tracking-widest">
          {Array.from({ length: 2 }).map((_, k) => (
            <div key={k} className="inline-flex items-center gap-12 px-12">
              <span>치즈필름</span>
              <span>★</span>
              <span>일진에게 찍혔을 때</span>
              <span>●</span>
              <span>스튜디오 치즈</span>
              <span>★</span>
              <span>웹드라마는 우리가 만든다</span>
              <span>●</span>
              <span>since 2017</span>
              <span>★</span>
              <span>say cheeze!</span>
              <span>●</span>
            </div>
          ))}
        </div>
      </div>

      {/* STORY */}
      <section
        id="story"
        className="mx-auto max-w-6xl px-5 py-20 grid md:grid-cols-[1fr_1.5fr] gap-12"
      >
        <Reveal as="div" className="reveal">
          <div className="text-xs uppercase tracking-[0.3em] text-cheeze-purple">
            {c("story.chapter")}
          </div>
          <h2
            className="mt-2 text-4xl md:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {c("story.heading.before")} <br />
            <Reveal as="span" className="scribble-draw">{c("story.heading.brand")}</Reveal> {c("story.heading.after")}
          </h2>
        </Reveal>
        <Reveal as="div" className="reveal space-y-5 text-cheeze-ink-soft leading-relaxed" delay={150}>
          <p>{c("story.paragraph1")}</p>
          <p>{c("story.paragraph2")}</p>
          <div className="flex flex-wrap gap-3 pt-3">
            <Reveal
              as="span"
              className="stamp stamp-pop text-cheeze-purple text-xs"
              delay={300}
            >
              실버 플레이 버튼
            </Reveal>
            <Reveal
              as="span"
              className="stamp stamp-pop text-cheeze-wine text-xs"
              delay={420}
            >
              골드 플레이 버튼
            </Reveal>
            <Reveal
              as="span"
              className="stamp stamp-pop text-cheeze-ink text-xs"
              delay={540}
            >
              뉴미디어 콘텐츠 대상
            </Reveal>
          </div>
        </Reveal>
      </section>

      <div className="sprocket-row mx-auto max-w-6xl px-5">
        <span className="text-cheeze-ink text-2xl">●</span>
      </div>

      {/* WORKS */}
      <section id="works" className="mx-auto max-w-6xl px-5 py-20">
        <Reveal as="div" className="reveal flex items-end justify-between flex-wrap gap-4 mb-10">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-cheeze-purple">
              CHAPTER 02
            </div>
            <h2
              className="mt-2 text-4xl md:text-5xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              대표작 / Filmography
            </h2>
          </div>
          <span className="tape text-sm">Roll #2</span>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8" style={{ perspective: 1000 }}>
          {worksWithThumbs.map((w, i) => (
            <Reveal key={w.title} delay={i * 140}>
              <TiltCard
                as="article"
                className="poster lightleak noise-overlay flex flex-col"
                max={4}
              >
              <div
                className={`aspect-[16/9] border-b-2 border-cheeze-purple-deep relative overflow-hidden ${w.videoId ? "bg-cheeze-charcoal" : w.accent}`}
              >
                {w.videoId ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://i.ytimg.com/vi/${w.videoId}/maxresdefault.jpg`}
                      alt={w.title}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    {/* Dark gradient so the corner labels stay legible */}
                    <span
                      aria-hidden
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(22,16,32,0.55) 0%, rgba(22,16,32,0.05) 35%, rgba(22,16,32,0.05) 65%, rgba(22,16,32,0.65) 100%)",
                      }}
                    />
                  </>
                ) : (
                  <span
                    aria-hidden
                    className={`absolute inset-0 grid place-items-center text-7xl sm:text-8xl opacity-95 ${w.numColor}`}
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                )}
                <span className="absolute top-3 left-3 tape text-[10px] sm:text-xs">
                  {w.badge}
                </span>
                <span className="absolute bottom-3 right-3 bg-cheeze-purple-deep/95 text-cheeze-yellow text-[10px] sm:text-xs px-2 py-1 font-bold tracking-widest">
                  ROLL #{String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <div className="p-5 flex flex-col gap-2">
                <div className="text-[11px] uppercase tracking-[0.25em] text-cheeze-olive">
                  {w.year}
                </div>
                <h3
                  className="text-2xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {w.title}
                </h3>
                <p className="italic text-cheeze-ink-soft">“{w.tagline}”</p>
                <p className="text-sm text-cheeze-ink-soft/80 mt-1">{w.note}</p>
                <a
                  href={
                    w.videoId
                      ? `https://www.youtube.com/watch?v=${w.videoId}`
                      : "https://www.youtube.com/@CheezeFilmz/videos"
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 text-sm font-bold underline underline-offset-4 hover:text-cheeze-purple"
                >
                  ▶ 영상 보기
                </a>
              </div>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </section>

      <div className="sprocket-row mx-auto max-w-6xl px-5">
        <span className="text-cheeze-ink text-2xl">●</span>
      </div>

      {/* RECENT LONGFORM */}
      {recentLongform.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-20">
          <Reveal as="div" className="reveal flex items-end justify-between flex-wrap gap-4 mb-10">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-cheeze-purple">
                CHAPTER 02.5 · LATEST · 🎬 LONGFORM
              </div>
              <h2
                className="mt-2 text-4xl md:text-5xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                최근 롱폼 영상
              </h2>
              <p className="text-sm text-cheeze-olive mt-2">
                {videoSource === "api"
                  ? "유튜브 채널과 1시간마다 자동 동기화됩니다."
                  : "RSS로 가져온 최신 영상 중 60초 초과 영상."}
              </p>
            </div>
            <Link
              href="/videos?kind=longform"
              className="text-sm font-bold uppercase tracking-widest underline underline-offset-4 hover:text-cheeze-purple"
            >
              롱폼 전체 보기 →
            </Link>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            {recentLongform.map((v, i) => (
              <Reveal key={v.id} delay={i * 80} className="reveal">
                <a
                  href={v.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group block"
                >
                  <div className="aspect-video relative overflow-hidden border-2 border-cheeze-purple-deep bg-cheeze-charcoal shadow-[5px_5px_0_var(--cheeze-purple-deep)] group-hover:shadow-[8px_8px_0_var(--cheeze-purple-deep)] transition-shadow lightleak">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={v.thumbnail}
                      alt={v.title}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <span className="absolute inset-0 grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity bg-cheeze-purple-deep/55 text-cheeze-yellow text-6xl">
                      ▶
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-bold leading-snug line-clamp-2 text-cheeze-ink">
                    {v.title}
                  </h3>
                </a>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* RECENT SHORTS — horizontal-feel grid of 9:16 cards */}
      {recentShorts.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 pb-20">
          <Reveal as="div" className="reveal flex items-end justify-between flex-wrap gap-4 mb-8">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-cheeze-purple">
                📱 SHORTS · QUICK BITES
              </div>
              <h2
                className="mt-2 text-3xl md:text-4xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                한 입 사이즈, 쇼츠
              </h2>
              <p className="text-sm text-cheeze-olive mt-2">
                60초 안에 끝나는 미니 컷.
              </p>
            </div>
            <Link
              href="/videos?kind=shorts"
              className="text-sm font-bold uppercase tracking-widest underline underline-offset-4 hover:text-cheeze-purple"
            >
              쇼츠 전체 보기 →
            </Link>
          </Reveal>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {recentShorts.map((v, i) => (
              <Reveal key={v.id} delay={i * 50} className="reveal">
                <a
                  href={v.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group block"
                >
                  <div className="aspect-[9/16] relative overflow-hidden border-2 border-cheeze-purple-deep bg-cheeze-charcoal shadow-[3px_3px_0_var(--cheeze-purple-deep)] group-hover:shadow-[5px_5px_0_var(--cheeze-purple-deep)] transition-shadow lightleak">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={v.thumbnail}
                      alt={v.title}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <span className="absolute top-2 left-2 bg-cheeze-yellow text-cheeze-purple-deep text-[10px] font-bold tracking-widest px-1.5 py-0.5">
                      SHORTS
                    </span>
                    <span className="absolute inset-0 grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity bg-cheeze-purple-deep/55 text-cheeze-yellow text-3xl">
                      ▶
                    </span>
                  </div>
                  <h3 className="mt-2 text-[13px] font-bold leading-snug line-clamp-2 text-cheeze-ink">
                    {v.title}
                  </h3>
                </a>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      <div className="sprocket-row mx-auto max-w-6xl px-5">
        <span className="text-cheeze-ink text-2xl">●</span>
      </div>

      {/* TEAM / CAST */}
      <section id="cast" className="mx-auto max-w-6xl px-5 py-20">
        <Reveal as="div" className="reveal">
          <div className="text-xs uppercase tracking-[0.3em] text-cheeze-purple">
            CHAPTER 03
          </div>
          <h2
            className="mt-2 text-4xl md:text-5xl mb-10"
            style={{ fontFamily: "var(--font-display)" }}
          >
            제작진 / Behind the Lens
          </h2>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-6">
          <Reveal as="div" className="reveal poster p-6 noise-overlay" delay={0}>
            <div className="text-xs uppercase tracking-[0.25em] text-cheeze-olive">
              대표 / Director
            </div>
            <h3
              className="mt-1 text-3xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              김은하
            </h3>
            <p className="mt-3 text-cheeze-ink-soft text-sm leading-relaxed">
              치즈필름과 스튜디오 치즈의 대표. 청춘의 사소한 감정선을 한
              장면으로 응축하는 연출을 좋아합니다.
            </p>
          </Reveal>

          <Reveal as="div" className="reveal poster p-6 noise-overlay" delay={140}>
            <div className="text-xs uppercase tracking-[0.25em] text-cheeze-olive">
              스튜디오 / Network
            </div>
            <h3
              className="mt-1 text-3xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              스튜디오 치즈
            </h3>
            <p className="mt-3 text-cheeze-ink-soft text-sm leading-relaxed">
              웹드라마와 광고를 만드는 제작사. 2020년 7월 법인 설립 후, 2021년
              샌드박스 네트워크와 손잡았습니다.
            </p>
          </Reveal>

          <Reveal as="div" className="reveal poster p-6 noise-overlay" delay={280}>
            <div className="text-xs uppercase tracking-[0.25em] text-cheeze-olive">
              합류한 배우들 / Cast
            </div>
            <h3
              className="mt-1 text-3xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              새로운 얼굴
            </h3>
            <p className="mt-3 text-cheeze-ink-soft text-sm leading-relaxed">
              치즈필름은 매 작품마다 새로운 얼굴을 찾습니다. 다음 한 컷의
              주인공이 당신이 될 수도 있어요.
            </p>
            <Link
              href="/support"
              className="mt-4 inline-block text-sm font-bold underline underline-offset-4 hover:text-cheeze-purple"
            >
              오디션 지원하기 →
            </Link>
          </Reveal>
        </div>
      </section>

      {/* CTA — the channel's signature deep purple block */}
      <section className="border-y-2 border-cheeze-purple-deep bg-cheeze-purple text-cheeze-cream">
        <div className="film-strip h-7" aria-hidden />
        <div className="mx-auto max-w-6xl px-5 py-16 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h2
              className="text-4xl md:text-5xl text-cheeze-yellow"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {c("cta.heading.line1")} <br /> {c("cta.heading.line2")}
            </h2>
            <p className="mt-4 text-cheeze-cream/85 max-w-md leading-relaxed whitespace-pre-line">
              {c("cta.body")}
            </p>
          </div>
          <div className="flex md:justify-end gap-4 flex-wrap">
            <Link href="/support?tab=audition" className="btn-accent">
              오디션 지원
            </Link>
            <Link
              href="/support?tab=fan"
              className="btn-ghost text-cheeze-yellow border-cheeze-yellow hover:bg-cheeze-yellow hover:text-cheeze-purple-deep"
            >
              응원 보내기
            </Link>
          </div>
        </div>
        <div className="film-strip h-7" aria-hidden />
      </section>

      <SiteFooter />
    </>
  );
}
