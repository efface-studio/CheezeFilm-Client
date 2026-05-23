import Link from "next/link";
import { V2Header, V2Footer } from "../page";
import { InView } from "@/components/Stagger";
import CareersReel from "@/components/CareersReel";

// Static-ish editorial page; only thing that changes is the `careers.*`
// content keys, which we flush via `revalidateTag("site_content")` from
// the admin content editor.
export const revalidate = 300;

export const metadata = {
  title: "채용 · Careers",
  description:
    "스튜디오 치즈는 매주 한 컷을 굽는 사람들과 함께합니다. 작가·연출·촬영·편집·운영, 결을 맞춰 일할 동료를 찾아요.",
  alternates: { canonical: "/careers" },
  openGraph: {
    title: "채용 · Careers | 치즈필름",
    description: "스튜디오 치즈와 함께 일할 사람을 찾고 있어요.",
    url: "/careers",
    type: "website",
    images: ["/cheeze-logo.png"],
  },
  twitter: { images: ["/cheeze-logo.png"] },
};

/**
 * Careers page — replaces the old "문의" nav slot. Hand-tuned editorial copy
 * for now; admin doesn't need a CMS for content this static.
 *
 * Applications funnel through `/support` (same audition flow the home
 * uses) so every submission lands in Supabase and the admin can triage
 * them from /admin instead of an inbox. No `mailto:` anywhere on this
 * page.
 *
 * Layout follows the V2 editorial grid: ledger-style number rail on the
 * left of each section, big display-serif headline, body type at 15px.
 */
const APPLY_HREF = "/support?tab=audition";

export default async function V2CareersPage() {
  return (
    <main className="min-h-screen bg-cheeze-cream text-cheeze-ink editorial flex flex-col">
      <V2Header />

      {/* ── HERO ──────────────────────────────────────────
          Editorial cover — giant "04" watermark behind huge headline, copy
          on the left, reel video on the right. No ledger duplication
          underneath; the WHO spread below has the full role list. */}
      <section className="border-b border-cheeze-purple-deep/15 relative overflow-hidden">
        {/* Oversized number watermark — pure typographic accent. */}
        <div
          aria-hidden
          className="hidden lg:block absolute -top-10 -left-4 select-none pointer-events-none text-cheeze-purple/[0.06] leading-none"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(20rem, 32vw, 36rem)",
          }}
        >
          04
        </div>
        <div className="relative mx-auto max-w-[100rem] px-6 pt-16 pb-14 grid lg:grid-cols-12 gap-x-10 gap-y-10">
          <div className="lg:col-span-7 flex flex-col">
            <InView className="v2-fade-up">
              <div className="text-[10px] tracking-[0.45em] uppercase text-cheeze-purple flex items-center gap-2">
                <span className="v2-pulse-dot" />
                Now casting · Now hiring
              </div>
              <h1
                className="mt-5 leading-[0.92] tracking-[-0.02em]"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(3rem, 8vw, 6.5rem)",
                }}
              >
                함께 한 컷을
                <br />
                <span className="relative inline-block">
                  <span className="relative z-10">구울 사람.</span>
                  {/* Yellow swipe underneath the second line */}
                  <span
                    aria-hidden
                    className="absolute left-0 right-0 bottom-2 h-4 bg-cheeze-yellow/85 -z-0"
                  />
                </span>
              </h1>
              <p className="mt-8 max-w-xl text-cheeze-ink-soft leading-relaxed text-[15px]">
                작은 스튜디오에서 시작해 매주 한 편씩 청춘의 한 장면을 굽고
                있어요. <strong className="text-cheeze-ink">배우</strong>를
                1순위로, 작가·연출·촬영·편집·운영 — 어느 자리든 결을 맞춰 오래
                함께할 사람을 천천히 찾고 있습니다.
              </p>
            </InView>

            {/* Stat strip — magazine masthead figures. */}
            <InView className="v2-fade-up mt-10 grid grid-cols-3 max-w-2xl border-y border-cheeze-purple-deep/20 divide-x divide-cheeze-purple-deep/15">
              <Stat number={ROLES.length} label="Open roles" />
              <Stat number="1st" label="배우 우선" accent="text-cheeze-purple-deep" />
              <Stat number="11.30" label="우선 검토" />
            </InView>

            <InView className="v2-fade-up mt-8 flex flex-wrap gap-3">
              <Link
                href={APPLY_HREF}
                className="group/cta inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-cheeze-ink text-white text-[14px] font-semibold hover:bg-cheeze-ink-soft transition-colors"
              >
                지원하기
                <span
                  aria-hidden
                  className="transition-transform group-hover/cta:translate-x-1"
                >
                  →
                </span>
              </Link>
              <a
                href="#roles"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-toss-50 text-cheeze-ink text-[14px] font-semibold hover:bg-toss-100 transition-colors"
              >
                포지션 보기
                <span aria-hidden>↓</span>
              </a>
            </InView>
          </div>

          {/* Right — reel video only, with caption underneath. No dense
              ledger; the WHO section handles the role list. */}
          <InView className="v2-fade-up lg:col-span-5 lg:pl-8 lg:border-l lg:border-cheeze-purple-deep/15">
            <div className="text-[10px] tracking-[0.3em] uppercase text-cheeze-olive mb-3 flex items-center gap-2">
              <span className="v2-pulse-dot" /> Audition reel
            </div>
            <CareersReel
              src="/reels/DQ_oNK3EW_w.mp4"
              label="치즈필름 주연배우 공개 오디션 릴스"
            />
            <div className="mt-4 flex items-center justify-between gap-3 text-[11px]">
              <span className="text-cheeze-ink-soft italic">
                "치즈필름과 함께 2026년을 만들어갈 주인공을 기다립니다."
              </span>
              <a
                href="https://www.instagram.com/p/DQ_oNK3EW_w/"
                target="_blank"
                rel="noreferrer"
                className="shrink-0 tracking-[0.25em] uppercase text-cheeze-purple hover:text-cheeze-purple-deep"
              >
                원본 ↗
              </a>
            </div>
          </InView>
        </div>
      </section>

      {/* ── WHY ──────────────────────────────────────────
          Dark band breaks the cream monotony. Pull quote dominates,
          supporting copy plays second fiddle on the right. */}
      <section className="bg-cheeze-charcoal text-cheeze-cream lg:-ml-56 lg:pl-56 border-b border-cheeze-charcoal">
        <div className="mx-auto max-w-[100rem] px-6 py-24 grid lg:grid-cols-12 gap-x-10 gap-y-12">
          <InView className="v2-fade-up lg:col-span-2">
            <div className="text-[10px] tracking-[0.4em] uppercase text-cheeze-yellow/80">
              — Why us
            </div>
            <div
              className="mt-3 text-[3rem] leading-none text-cheeze-yellow"
              style={{ fontFamily: "var(--font-display)" }}
            >
              01
            </div>
          </InView>
          <InView className="v2-fade-up lg:col-span-6">
            {/* Decorative open quote */}
            <span
              aria-hidden
              className="block text-cheeze-yellow leading-none"
              style={{ fontFamily: "var(--font-display)", fontSize: "5rem" }}
            >
              "
            </span>
            <blockquote
              className="-mt-4 text-3xl md:text-5xl leading-[1.15] text-cheeze-cream"
              style={{ fontFamily: "var(--font-display)" }}
            >
              회사가 커진다고{" "}
              <span className="text-cheeze-yellow">작품의 결이 흐려지면</span>{" "}
              안 된다.
            </blockquote>
            <div className="mt-6 text-[11px] tracking-[0.3em] uppercase text-cheeze-cream/55">
              — Studio Cheeze, 2026
            </div>
          </InView>
          <InView className="v2-fade-up lg:col-span-4 lg:border-l lg:border-cheeze-cream/15 lg:pl-8 space-y-5 text-cheeze-cream/80 text-[14px] leading-relaxed">
            <p>
              대형 제작사처럼 분업화된 시스템보다, 한 사람이 처음부터 끝까지
              작품에 깊게 관여하는 환경을 만들고 있어요. 본인 손으로 청춘
              드라마 한 편을 굽는다는 감각이 무엇보다 중요합니다.
            </p>
            <p>
              3년 안에 영화 한 편, 시리즈 한 시즌. 채널에서 만든 톤을 더 큰
              포맷으로 옮기는 일을 진지하게 준비 중이고, 거기에 손을 보태고
              싶은 분이라면 좋아요.
            </p>
          </InView>
        </div>
      </section>

      {/* ── WHO ──────────────────────────────────────────
          Magazine "casting call" page. 1순위 배우 takes a full-bleed
          yellow block that dominates. Five other roles stack underneath
          as oversized numbered rows with hover-reveal tags. */}
      <section
        id="roles"
        className="border-b border-cheeze-purple-deep/15 scroll-mt-8"
      >
        <div className="mx-auto max-w-[100rem] px-6 pt-20 pb-24">
          <InView className="v2-fade-up flex items-end justify-between gap-6 mb-12">
            <div>
              <div className="text-[10px] tracking-[0.4em] uppercase text-cheeze-olive">
                — Casting call · 02
              </div>
              <h2
                className="mt-3 leading-[0.95] tracking-[-0.01em]"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(2.6rem, 5vw, 4.5rem)",
                }}
              >
                찾고 있는 사람.
              </h2>
            </div>
            <span className="hidden md:inline-flex font-mono text-[11px] tracking-wider text-cheeze-olive/60">
              {String(ROLES.length).padStart(2, "0")} positions
            </span>
          </InView>

          {/* Featured role — 1순위 배우 as a yellow editorial block */}
          {(() => {
            const lead = ROLES[0];
            return (
              <InView className="v2-fade-up bg-cheeze-yellow text-cheeze-purple-deep grid md:grid-cols-12 gap-x-10 gap-y-6 p-8 md:p-12 relative overflow-hidden">
                {/* Big "01" watermark */}
                <span
                  aria-hidden
                  className="absolute -right-4 -bottom-16 leading-none select-none text-cheeze-purple-deep/10"
                  style={{ fontFamily: "var(--font-display)", fontSize: "22rem" }}
                >
                  01
                </span>
                <div className="md:col-span-7 relative">
                  <div className="text-[10px] tracking-[0.4em] uppercase font-bold">
                    Featured · 1st priority
                  </div>
                  <h3
                    className="mt-3 leading-none tracking-[-0.01em]"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "clamp(2.2rem, 4.5vw, 4rem)",
                    }}
                  >
                    {lead.title}
                  </h3>
                  <p className="mt-5 text-[15px] leading-relaxed max-w-xl">
                    {lead.desc}
                  </p>
                </div>
                <div className="md:col-span-5 relative flex flex-col justify-end gap-4">
                  <ul className="space-y-1.5 text-[13px]">
                    {lead.tags.map((t) => (
                      <li key={t} className="flex gap-2">
                        <span aria-hidden className="opacity-50">
                          ◆
                        </span>
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={APPLY_HREF}
                    className="mt-2 inline-flex items-center gap-1.5 self-start px-4 py-2.5 rounded-xl bg-cheeze-purple-deep text-white text-[13px] font-semibold hover:bg-cheeze-purple transition-colors"
                  >
                    배우로 지원하기
                    <span aria-hidden>→</span>
                  </Link>
                </div>
              </InView>
            );
          })()}

          {/* Other roles — oversized numbered editorial rows.
              Hover expands the description; tags slide in. */}
          <ol className="mt-12 border-t border-cheeze-purple-deep/15">
            {ROLES.slice(1).map((r, i) => {
              const num = String(i + 2).padStart(2, "0");
              return (
                <InView
                  as="li"
                  key={r.title}
                  className="v2-fade-up group border-b border-cheeze-purple-deep/15"
                  style={{ transitionDelay: `${i * 60}ms` } as React.CSSProperties}
                >
                  <div className="grid lg:grid-cols-12 gap-x-10 gap-y-3 py-6 lg:py-8 items-baseline cursor-default">
                    {/* Big number */}
                    <div className="lg:col-span-2 flex items-baseline gap-3">
                      <span className="font-mono text-[10px] tracking-wider tabular-nums text-cheeze-olive/60 pt-3">
                        №
                      </span>
                      <span
                        className="leading-none text-cheeze-ink/30 group-hover:text-cheeze-purple transition-colors"
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: "clamp(2.4rem, 4vw, 3.5rem)",
                        }}
                      >
                        {num}
                      </span>
                    </div>
                    {/* Title + desc */}
                    <div className="lg:col-span-7">
                      <h3
                        className="leading-tight tracking-tight transition-colors group-hover:text-cheeze-purple-deep"
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: "clamp(1.5rem, 2.4vw, 2.2rem)",
                        }}
                      >
                        {r.title}
                      </h3>
                      <p className="mt-2 text-[14px] text-cheeze-ink-soft leading-relaxed max-w-2xl">
                        {r.desc}
                      </p>
                    </div>
                    {/* Tags — visible as chips */}
                    <ul className="lg:col-span-3 flex flex-wrap gap-1.5 lg:justify-end">
                      {r.tags.map((t) => (
                        <li
                          key={t}
                          className="text-[10px] tracking-wider uppercase text-cheeze-olive border border-cheeze-purple-deep/20 px-2 py-1 group-hover:border-cheeze-purple/50 group-hover:text-cheeze-purple-deep transition-colors"
                        >
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                </InView>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ── HOW ──────────────────────────────────────────
          Purple band — three-step process visual + a single, focused
          "지원하기" button at the end. The old version had a wall-sized
          email address as the CTA, but applications now go through the
          on-site form (`/support`) and land in Supabase for admin
          triage, so the email block is gone. */}
      <section className="bg-cheeze-purple-deep text-cheeze-cream lg:-ml-56 lg:pl-56">
        <div className="mx-auto max-w-[100rem] px-6 py-24">
          <InView className="v2-fade-up flex items-end justify-between gap-6 mb-14">
            <div>
              <div className="text-[10px] tracking-[0.4em] uppercase text-cheeze-yellow flex items-center gap-2">
                <span className="v2-pulse-dot" /> How to apply · 03
              </div>
              <h2
                className="mt-5 text-5xl md:text-6xl tracking-tight leading-[1] text-cheeze-yellow"
                style={{ fontFamily: "var(--font-display)" }}
              >
                지원, 어렵지 않아요.
              </h2>
            </div>
            <span className="hidden md:inline-flex font-mono text-[11px] tracking-widest uppercase text-cheeze-yellow/60">
              3 steps · 1 form
            </span>
          </InView>

          {/* Three-step process — same numbered editorial cards, now
              describing the on-site form flow instead of an email
              hand-off. */}
          <ol className="grid md:grid-cols-3 gap-x-6 gap-y-8 border-y border-cheeze-cream/15 py-12">
            {[
              {
                step: "01",
                title: "공고 선택",
                body: "지원 페이지에서 진행 중인 오디션 공고를 골라요. 배우·작가·연출·운영 등 모든 포지션이 한 곳에 모여있어요.",
              },
              {
                step: "02",
                title: "지원서 작성",
                body: "이름·연락처·짧은 자기소개와 작품 링크. 첨부 자료는 한 번에 업로드돼요. 양식 없음, 1~2분이면 끝.",
              },
              {
                step: "03",
                title: "작가·대표 면담",
                body: "검토 후 1주 안에 회신해요. 줌 또는 합정 사무실에서 일하는 방식·작품 톤·기대치를 맞춰봐요.",
              },
            ].map((s, i) => (
              <InView
                key={s.step}
                as="li"
                className="v2-fade-up relative"
                style={{ transitionDelay: `${i * 100}ms` } as React.CSSProperties}
              >
                <div
                  className="text-cheeze-yellow/35 leading-none mb-3"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "4rem",
                  }}
                >
                  {s.step}
                </div>
                <h3
                  className="text-2xl text-cheeze-yellow tracking-tight"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {s.title}
                </h3>
                <p className="mt-3 text-[14px] leading-relaxed text-cheeze-cream/80 max-w-xs">
                  {s.body}
                </p>
                {/* Arrow connector between steps */}
                {i < 2 && (
                  <span
                    aria-hidden
                    className="hidden md:block absolute -right-3 top-6 text-cheeze-yellow/30"
                  >
                    →
                  </span>
                )}
              </InView>
            ))}
          </ol>

          {/* Focused CTA + side notes. Replaces the previous wall-sized
              email — a single primary button to the form, plus the two
              utility rows (fan letter, on-site visit) tucked alongside
              so the visual weight doesn't shout. */}
          <InView className="v2-fade-up mt-14 grid lg:grid-cols-12 gap-x-10 gap-y-10 items-center">
            <div className="lg:col-span-7">
              <div className="text-[10px] tracking-[0.3em] uppercase text-cheeze-yellow/70 mb-3">
                Apply now
              </div>
              <h3
                className="leading-tight tracking-tight text-cheeze-yellow"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(2rem, 3.6vw, 3rem)",
                }}
              >
                지원서 한 장이면
                <br />
                다음 단계로.
              </h3>
              <p className="mt-5 max-w-lg text-cheeze-cream/70 text-[14px] leading-relaxed">
                모든 지원은 같은 폼을 통해 받고 있어요. 공고를 고른 뒤 짧은
                양식만 채우시면, 작가·대표가 직접 확인합니다.
              </p>
              <Link
                href={APPLY_HREF}
                className="group/apply mt-8 inline-flex items-center gap-3 px-7 py-4 bg-cheeze-yellow text-cheeze-purple-deep font-bold tracking-widest uppercase text-sm hover:bg-cheeze-cream transition-colors"
              >
                지원 페이지로
                <span
                  aria-hidden
                  className="transition-transform group-hover/apply:translate-x-1"
                >
                  →
                </span>
              </Link>
            </div>
            <div className="lg:col-span-5 lg:border-l lg:border-cheeze-cream/15 lg:pl-10 space-y-4 text-[13px]">
              <Row label="채용 외 문의">
                <Link
                  href="/support?tab=fan"
                  className="text-cheeze-cream/85 underline decoration-cheeze-cream/30 underline-offset-4 hover:text-cheeze-yellow hover:decoration-cheeze-yellow"
                >
                  응원 메시지 / 팬레터 보내기 →
                </Link>
              </Row>
              <Row label="현장 견학">
                현재 비공개. 합류 결정 후 가능합니다.
              </Row>
            </div>
          </InView>
        </div>
      </section>

      <V2Footer />
    </main>
  );
}

const ROLES = [
  {
    // 1순위 — 채널의 얼굴이 되는 배우. 새 작품의 주연을 맡을 분.
    title: "배우 (주연/조연)",
    desc: "치즈필름 신작의 얼굴이 될 배우. 10~30분짜리 단편 안에서 청춘의 한 컷을 진짜처럼 살아낼 수 있는 분.",
    tags: ["10대 후반~30대", "오디션 영상/프로필 필수", "본업·부업 OK"],
  },
  {
    title: "작가",
    desc: "10분짜리 단편을 매주 한 편씩 굽는 작가. 청춘 드라마의 톤을 이해하고, 대사로 인물을 살릴 수 있는 분.",
    tags: ["단편 시나리오 경력", "치즈필름 채널 시청 다수", "협업 가능한 분"],
  },
  {
    title: "연출",
    desc: "현장을 책임지는 연출. 한 회차 안에서 인물의 작은 변화를 카메라로 잡아내는 데 관심이 많은 분.",
    tags: ["단편 연출 1편 이상", "스토리보드 가능", "여러 톤 소화 가능"],
  },
  {
    title: "촬영 · 조명",
    desc: "현장에서 빛과 구도를 책임지는 사람. DSLR/미러리스 · 시네마 카메라 모두 환영.",
    tags: ["기본 장비 운용", "조명 셋업 가능", "야외 촬영 OK"],
  },
  {
    title: "편집",
    desc: "한 컷의 길이가 작품의 결을 결정한다고 믿는 분. 음악·SFX 감각이 함께 있는 분 우대.",
    tags: ["Premiere/DaVinci 능숙", "컬러 그레이딩 경험", "쇼츠 편집 별도"],
  },
  {
    title: "운영 · PD",
    desc: "촬영 일정, 출연자 케어, 예산 관리. 작품이 차질 없이 굴러가도록 안 보이는 곳에서 일하는 분.",
    tags: ["스케줄 관리", "외부 커뮤니케이션", "엑셀/노션"],
  },
];

/** Small editorial stat card used in the hero strip — one big figure +
 *  caption. Three of these sit side-by-side with vertical dividers. */
function Stat({
  number,
  label,
  accent,
}: {
  number: React.ReactNode;
  label: string;
  accent?: string;
}) {
  return (
    <div className="px-5 py-4 first:pl-0 last:pr-0">
      <div
        className={`text-3xl md:text-4xl leading-none tabular-nums ${accent ?? "text-cheeze-ink"}`}
        style={{ fontFamily: "var(--font-display)" }}
      >
        {number}
      </div>
      <div className="mt-2 text-[10px] tracking-[0.3em] uppercase text-cheeze-olive">
        {label}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[6rem_1fr] gap-3 items-baseline pb-3 border-b border-cheeze-cream/15">
      <span className="text-[10px] tracking-[0.3em] uppercase text-cheeze-yellow/80">
        {label}
      </span>
      <span className="leading-relaxed">{children}</span>
    </div>
  );
}
