import Link from "next/link";
import { SiteHeader, SiteFooter } from "../page";
import { InView } from "@/components/Stagger";
import CareersReel from "@/components/CareersReel";
import { t, type Lang } from "@/lib/i18n";
import { getServerLang } from "@/lib/i18n.server";

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
 * Layout follows the editorial grid: ledger-style number rail on the
 * left of each section, big display-serif headline, body type at 15px.
 */
const APPLY_HREF = "/support?tab=audition";

type Role = {
  title: string;
  desc: string;
  tags: [string, string, string];
};

/** Build the role list for the active lang. Defined as a function so the
 *  ROLES list can pull translated values via `t()` without leaking the
 *  module scope. */
function buildRoles(lang: Lang): Role[] {
  return [
    {
      // 1순위 — 채널의 얼굴이 되는 배우. 새 작품의 주연을 맡을 분.
      title: t("role.actor.title", lang),
      desc: t("role.actor.desc", lang),
      tags: [
        t("role.actor.tag1", lang),
        t("role.actor.tag2", lang),
        t("role.actor.tag3", lang),
      ],
    },
    {
      title: t("role.writer.title", lang),
      desc: t("role.writer.desc", lang),
      tags: [
        t("role.writer.tag1", lang),
        t("role.writer.tag2", lang),
        t("role.writer.tag3", lang),
      ],
    },
    {
      title: t("role.director.title", lang),
      desc: t("role.director.desc", lang),
      tags: [
        t("role.director.tag1", lang),
        t("role.director.tag2", lang),
        t("role.director.tag3", lang),
      ],
    },
    {
      title: t("role.dp.title", lang),
      desc: t("role.dp.desc", lang),
      tags: [
        t("role.dp.tag1", lang),
        t("role.dp.tag2", lang),
        t("role.dp.tag3", lang),
      ],
    },
    {
      title: t("role.editor.title", lang),
      desc: t("role.editor.desc", lang),
      tags: [
        t("role.editor.tag1", lang),
        t("role.editor.tag2", lang),
        t("role.editor.tag3", lang),
      ],
    },
    {
      title: t("role.pd.title", lang),
      desc: t("role.pd.desc", lang),
      tags: [
        t("role.pd.tag1", lang),
        t("role.pd.tag2", lang),
        t("role.pd.tag3", lang),
      ],
    },
  ];
}

export default async function CareersPage() {
  const lang = await getServerLang();
  const ROLES = buildRoles(lang);
  return (
    <main className="min-h-screen bg-cheeze-cream text-cheeze-ink editorial flex flex-col">
      <SiteHeader />

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
            <InView className="fade-up">
              <div className="text-[10px] tracking-[0.45em] uppercase text-cheeze-purple flex items-center gap-2">
                <span className="pulse-dot" />
                {t("careers.hero.nowcasting", lang)}
              </div>
              <h1
                className="mt-5 leading-[0.92] tracking-[-0.02em]"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(3rem, 8vw, 6.5rem)",
                }}
              >
                {t("careers.hero.headline.line1", lang)}
                <br />
                <span className="relative inline-block">
                  <span className="relative z-10">
                    {t("careers.hero.headline.line2", lang)}
                  </span>
                  {/* Yellow swipe underneath the second line */}
                  <span
                    aria-hidden
                    className="absolute left-0 right-0 bottom-2 h-4 bg-cheeze-yellow/85 -z-0"
                  />
                </span>
              </h1>
              <p className="mt-8 max-w-xl text-cheeze-ink-soft leading-relaxed text-[15px]">
                {t("careers.hero.lede.before", lang)}
                <strong className="text-cheeze-ink">
                  {t("careers.hero.priority", lang)}
                </strong>
                {t("careers.hero.lede.after", lang)}
              </p>
            </InView>

            {/* Stat strip — magazine masthead figures. On phones the
                3-col + vertical dividers crushed Korean labels
                (오디션·정시 등) into ~100px columns with the divide-x
                slicing the kerning. Stacks 1-up on mobile with
                horizontal rules instead, snaps back to the 3-up
                masthead at sm+. */}
            <InView className="fade-up mt-10 grid grid-cols-1 sm:grid-cols-3 max-w-2xl border-y border-cheeze-purple-deep/20 divide-y sm:divide-y-0 sm:divide-x divide-cheeze-purple-deep/15">
              <Stat number={ROLES.length} label={t("careers.stat.open", lang)} />
              <Stat
                number="1st"
                label={t("careers.stat.actor", lang)}
                accent="text-cheeze-purple-deep"
              />
              <Stat number="11.30" label={t("careers.stat.review", lang)} />
            </InView>

            <InView className="fade-up mt-8 flex flex-wrap gap-3">
              <Link
                href={APPLY_HREF}
                className="group/cta inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-cheeze-ink text-white text-[14px] font-semibold hover:bg-cheeze-ink-soft transition-colors"
              >
                {t("careers.cta.apply", lang)}
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
                {t("careers.cta.viewPositions", lang)}
                <span aria-hidden>↓</span>
              </a>
            </InView>
          </div>

          {/* Right — reel video only, with caption underneath. No dense
              ledger; the WHO section handles the role list. */}
          <InView className="fade-up lg:col-span-5 lg:pl-8 lg:border-l lg:border-cheeze-purple-deep/15">
            <div className="text-[10px] tracking-[0.3em] uppercase text-cheeze-olive mb-3 flex items-center gap-2">
              <span className="pulse-dot" /> {t("careers.reel.eyebrow", lang)}
            </div>
            <CareersReel
              src="/reels/DQ_oNK3EW_w.mp4"
              label={t("careers.reel.label", lang)}
            />
            <div className="mt-4 flex items-center justify-between gap-3 text-[11px]">
              <span className="text-cheeze-ink-soft italic">
                &ldquo;{t("careers.reel.caption", lang)}&rdquo;
              </span>
              <a
                href="https://www.instagram.com/p/DQ_oNK3EW_w/"
                target="_blank"
                rel="noreferrer"
                className="shrink-0 tracking-[0.25em] uppercase text-cheeze-purple hover:text-cheeze-purple-deep"
              >
                {t("careers.reel.source", lang)} ↗
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
          <InView className="fade-up lg:col-span-2">
            <div className="text-[10px] tracking-[0.4em] uppercase text-cheeze-yellow/80">
              {t("careers.why.eyebrow", lang)}
            </div>
            <div
              className="mt-3 text-[3rem] leading-none text-cheeze-yellow"
              style={{ fontFamily: "var(--font-display)" }}
            >
              01
            </div>
          </InView>
          <InView className="fade-up lg:col-span-6">
            {/* Decorative open quote */}
            <span
              aria-hidden
              className="block text-cheeze-yellow leading-none"
              style={{ fontFamily: "var(--font-display)", fontSize: "5rem" }}
            >
              &ldquo;
            </span>
            <blockquote
              className="-mt-4 text-3xl md:text-5xl leading-[1.15] text-cheeze-cream"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {t("careers.why.quote.before", lang)}{" "}
              <span className="text-cheeze-yellow">
                {t("careers.why.quote.highlight", lang)}
              </span>{" "}
              {t("careers.why.quote.after", lang)}
            </blockquote>
            <div className="mt-6 text-[11px] tracking-[0.3em] uppercase text-cheeze-cream/55">
              {t("careers.why.attribution", lang)}
            </div>
          </InView>
          <InView className="fade-up lg:col-span-4 lg:border-l lg:border-cheeze-cream/15 lg:pl-8 space-y-5 text-cheeze-cream/80 text-[14px] leading-relaxed">
            <p>{t("careers.why.body1", lang)}</p>
            <p>{t("careers.why.body2", lang)}</p>
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
          <InView className="fade-up flex items-end justify-between gap-6 mb-12">
            <div>
              <div className="text-[10px] tracking-[0.4em] uppercase text-cheeze-olive">
                {t("careers.who.eyebrow", lang)}
              </div>
              <h2
                className="mt-3 leading-[0.95] tracking-[-0.01em]"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(2.6rem, 5vw, 4.5rem)",
                }}
              >
                {t("careers.section.casting", lang)}
              </h2>
            </div>
            <span className="hidden md:inline-flex font-mono text-[11px] tracking-wider text-cheeze-olive/60">
              {String(ROLES.length).padStart(2, "0")}{" "}
              {t("careers.section.positions", lang)}
            </span>
          </InView>

          {/* Featured role — 1순위 배우.
              Was a heavy yellow-everywhere block with a giant "01"
              watermark and ◆ bullets. Redesigned as a clean white
              editorial card with yellow used as an ACCENT only:
                - a yellow ribbon stripe on the left edge marks it
                  as the priority slot at a glance,
                - a small "FEATURED 01" pill in cheeze-yellow tones
                  carries the priority label without dominating,
                - tags become soft yellow chips (no more ◆),
                - the CTA is a proper Toss-style purple pill button.
              Net result: card reads as premium-quality rather than
              loud, and matches the rest of the Toss surface. */}
          {(() => {
            const lead = ROLES[0];
            return (
              <InView className="fade-up relative overflow-hidden rounded-3xl bg-white border border-cheeze-purple-deep/10 shadow-[0_1px_0_rgba(17,24,39,0.04),0_24px_48px_-24px_rgba(85,34,163,0.18)]">
                {/* Yellow ribbon stripe on the left edge */}
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-cheeze-yellow via-cheeze-yellow-deep to-cheeze-yellow"
                />

                <div className="grid md:grid-cols-12 gap-x-10 gap-y-8 p-8 md:p-12 pl-9 md:pl-14">
                  <div className="md:col-span-7">
                    {/* Priority pill — yellow tint, not a full yellow bg */}
                    <div className="inline-flex items-center gap-2 rounded-full bg-cheeze-yellow/15 text-cheeze-purple-deep px-3 py-1.5">
                      <span
                        className="text-[11px] font-mono tabular-nums tracking-wider font-bold"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        01
                      </span>
                      <span aria-hidden className="block w-px h-3 bg-cheeze-purple-deep/30" />
                      <span className="text-[10px] tracking-[0.3em] uppercase font-bold">
                        {t("careers.lead.featured", lang)}
                      </span>
                    </div>

                    <h3
                      className="mt-5 leading-[0.95] tracking-[-0.02em] text-cheeze-ink"
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "clamp(2rem, 4vw, 3.4rem)",
                      }}
                    >
                      {lead.title}
                    </h3>
                    <p className="mt-4 text-[15px] leading-relaxed text-cheeze-ink-soft max-w-xl">
                      {lead.desc}
                    </p>

                    {/* Tags — soft yellow chips, not ◆ bullets */}
                    <ul className="mt-6 flex flex-wrap gap-2">
                      {lead.tags.map((tag) => (
                        <li
                          key={tag}
                          className="inline-flex items-center rounded-full bg-cheeze-yellow/20 text-cheeze-purple-deep text-[12px] font-semibold px-3 py-1.5"
                        >
                          {tag}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA column — sits to the right on md+, falls below
                      on mobile. Big rounded button with a hover slide
                      on the arrow for affordance. */}
                  <div className="md:col-span-5 flex md:justify-end md:items-end">
                    <Link
                      href={APPLY_HREF}
                      className="group/cta inline-flex items-center justify-between gap-4 w-full md:w-auto md:min-w-[16rem] px-6 py-4 rounded-2xl bg-cheeze-purple-deep text-white hover:bg-cheeze-purple transition-colors shadow-[0_8px_24px_-12px_rgba(85,34,163,0.6)]"
                    >
                      <span className="text-[15px] font-bold tracking-tight">
                        {t("careers.apply.actor", lang)}
                      </span>
                      <span
                        aria-hidden
                        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-cheeze-yellow text-cheeze-purple-deep font-bold transition-transform group-hover/cta:translate-x-1"
                      >
                        →
                      </span>
                    </Link>
                  </div>
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
                  className="fade-up group border-b border-cheeze-purple-deep/15"
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
                      {r.tags.map((tag) => (
                        <li
                          key={tag}
                          className="text-[10px] tracking-wider uppercase text-cheeze-olive border border-cheeze-purple-deep/20 px-2 py-1 group-hover:border-cheeze-purple/50 group-hover:text-cheeze-purple-deep transition-colors"
                        >
                          {tag}
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
          <InView className="fade-up flex items-end justify-between gap-6 mb-14">
            <div>
              <div className="text-[10px] tracking-[0.4em] uppercase text-cheeze-yellow flex items-center gap-2">
                <span className="pulse-dot" /> {t("careers.how.eyebrow", lang)}
              </div>
              <h2
                className="mt-5 text-5xl md:text-6xl tracking-tight leading-[1] text-cheeze-yellow"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {t("careers.how.title", lang)}
              </h2>
            </div>
            <span className="hidden md:inline-flex font-mono text-[11px] tracking-widest uppercase text-cheeze-yellow/60">
              {t("careers.how.summary", lang)}
            </span>
          </InView>

          {/* Three-step process — same numbered editorial cards, now
              describing the on-site form flow instead of an email
              hand-off. */}
          <ol className="grid md:grid-cols-3 gap-x-6 gap-y-8 border-y border-cheeze-cream/15 py-12">
            {[
              {
                step: "01",
                title: t("careers.how.step1.title", lang),
                body: t("careers.how.step1.body", lang),
              },
              {
                step: "02",
                title: t("careers.how.step2.title", lang),
                body: t("careers.how.step2.body", lang),
              },
              {
                step: "03",
                title: t("careers.how.step3.title", lang),
                body: t("careers.how.step3.body", lang),
              },
            ].map((s, i) => (
              <InView
                key={s.step}
                as="li"
                className="fade-up relative"
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
          <InView className="fade-up mt-14 grid lg:grid-cols-12 gap-x-10 gap-y-10 items-center">
            <div className="lg:col-span-7">
              <div className="text-[10px] tracking-[0.3em] uppercase text-cheeze-yellow/70 mb-3">
                {t("careers.apply.eyebrow", lang)}
              </div>
              <h3
                className="leading-tight tracking-tight text-cheeze-yellow"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(2rem, 3.6vw, 3rem)",
                }}
              >
                {t("careers.apply.headline.line1", lang)}
                <br />
                {t("careers.apply.headline.line2", lang)}
              </h3>
              <p className="mt-5 max-w-lg text-cheeze-cream/70 text-[14px] leading-relaxed">
                {t("careers.apply.body", lang)}
              </p>
              <Link
                href={APPLY_HREF}
                className="group/apply mt-8 inline-flex items-center gap-3 px-7 py-4 bg-cheeze-yellow text-cheeze-purple-deep font-bold tracking-widest uppercase text-sm hover:bg-cheeze-cream transition-colors"
              >
                {t("careers.apply.cta", lang)}
                <span
                  aria-hidden
                  className="transition-transform group-hover/apply:translate-x-1"
                >
                  →
                </span>
              </Link>
            </div>
            <div className="lg:col-span-5 lg:border-l lg:border-cheeze-cream/15 lg:pl-10 space-y-4 text-[13px]">
              <Row label={t("careers.row.other", lang)}>
                <Link
                  href="/support?tab=fan"
                  className="text-cheeze-cream/85 underline decoration-cheeze-cream/30 underline-offset-4 hover:text-cheeze-yellow hover:decoration-cheeze-yellow"
                >
                  {t("careers.row.other.link", lang)} →
                </Link>
              </Row>
              <Row label={t("careers.row.visit", lang)}>
                {t("careers.row.visit.body", lang)}
              </Row>
            </div>
          </InView>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

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
    // Tightened mobile padding (`px-3 py-3` instead of `px-5 py-4`) so
    // the 3-up stat strip doesn't crush each cell on phones where the
    // Korean labels ("배우 우선", "우선 검토") are 4–5 characters and
    // already need the full column width. At sm+ we go back to the
    // original generous padding so the masthead feels editorial again.
    <div className="px-3 py-3 sm:px-5 sm:py-4 first:pl-0 last:pr-0">
      <div
        className={`text-2xl sm:text-3xl md:text-4xl leading-none tabular-nums ${accent ?? "text-cheeze-ink"}`}
        style={{ fontFamily: "var(--font-display)" }}
      >
        {number}
      </div>
      <div className="mt-2 text-[10px] tracking-[0.2em] sm:tracking-[0.3em] uppercase text-cheeze-olive">
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
