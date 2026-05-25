"use client";

import Link, { useLinkStatus } from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import LangToggle from "@/components/LangToggle";
import type { Lang } from "@/lib/i18n";

/**
 * Pending indicator — sits inside a Link and lights up the moment Next
 * starts the navigation (before any new HTML arrives). Replaces the
 * yellow active marker with a pulsing one so the user sees "click
 * registered, page is loading". Hidden until 120ms have passed so it
 * doesn't flash for instant local navigations.
 */
function LinkPending() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span
      aria-hidden
      className="absolute -left-7 top-1/2 -translate-y-1/2 h-px w-7 bg-cheeze-yellow"
      style={{
        opacity: 0,
        animation: "link-pending 1s ease-in-out 120ms infinite",
      }}
    />
  );
}

/**
 * Editorial navigation — left side rail on lg+, compact top bar on mobile.
 *
 * Replaces the previous full-width horizontal top bar. The side rail
 *  - sits flush against the left edge (no border on desktop, blends into the
 *    cream background via 80%-opacity backdrop blur),
 *  - tracks which section of the page is in view via IntersectionObserver
 *    and animates a yellow marker between nav items so the active section
 *    "moves" smoothly as the user scrolls.
 *
 * The four anchor sections on `/` (`#issue`, `#films`, `#cast`, `#contact`)
 * are pre-existing — this component just observes them.
 */

type NavItem = {
  num: string;
  label: string;
  labelEn: string;
  href: string;
  /** ID of the section to scroll-spy against, on `/`. */
  sectionId: "issue" | "films" | "cast" | "careers";
  /** Path that should mark this item active when the user is on a child page. */
  routeMatch?: string;
};

// The rail is the "table of contents" for the home spread, so every
// item scrolls within `/` instead of jumping to a separate route. The
// dedicated detail pages (`/videos`, `/members`, `/careers`)
// are still reachable — each home section has a "더 보기 →" CTA into
// them. Keeping `routeMatch` around so the rail still highlights the
// right item when a visitor lands on a detail page directly (e.g. from
// search or a deep link).
const NAV: NavItem[] = [
  // 소개 → page top (#top sentinel). The scroll-spy still lights up
  // "01 소개" while the user is anywhere in the hero/stats/issue
  // range because those sections carry `data-nav-section="issue"`;
  // clicking the rail item just sends them back up to y=0.
  { num: "01", label: "소개",   labelEn: "About",   href: "/#top",      sectionId: "issue" },
  { num: "02", label: "멤버",   labelEn: "Cast",    href: "/#cast",     sectionId: "cast",    routeMatch: "/members" },
  { num: "03", label: "영상",   labelEn: "Films",   href: "/#films",    sectionId: "films",   routeMatch: "/videos" },
  { num: "04", label: "채용",   labelEn: "Careers", href: "/#careers",  sectionId: "careers", routeMatch: "/careers" },
];

type OpenRoleType = "lead" | "support" | "extra" | "staff";

/** Map the actual open role types to a lang-aware status label.
 *  Labels are tight enough to fit on one line at the rail's 220px
 *  width without needing wide tracking — the previous
 *  "오디션 · 스태프 모집 중" line was 12 chars and wrapped "중" onto
 *  its own row in the CTA card. Kept short and active. */
function deriveOpenLabel(roleTypes: Set<OpenRoleType>, lang: Lang): string {
  const hasStaff = roleTypes.has("staff");
  const hasAudition =
    roleTypes.has("lead") ||
    roleTypes.has("support") ||
    roleTypes.has("extra");
  if (lang === "en") {
    if (hasStaff && hasAudition) return "Now casting + hiring";
    if (hasAudition) return "Now casting";
    if (hasStaff) return "Now hiring";
  } else {
    if (hasStaff && hasAudition) return "오디션 + 스태프 모집";
    if (hasAudition) return "오디션 모집 중";
    if (hasStaff) return "스태프 모집 중";
  }
  // Sentinel: no openings, used by the caller to hide the row.
  return "";
}

export default function SiteNav({ lang = "ko" }: { lang?: Lang }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [activeId, setActiveId] = useState<NavItem["sectionId"] | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Status label for the rail CTA — derived from what's actually open
  // right now, not hard-coded. Defaults to empty string until the fetch
  // resolves; the CTA falls back to a generic "지원 페이지로" caption
  // while we don't know yet. Re-runs on path change so the label
  // refreshes after the user navigates away from /support (admin may
  // have flipped a listing open in another tab).
  const [openLabel, setOpenLabel] = useState<string | null>(null);

  // Mark <html> as a editorial route while mounted. Used by globals.css
  // to swap the canvas background to purple-deep so bottom rubber-band
  // doesn't expose a cream stripe under the footer. We can't use
  // `html:has(main.editorial)` — Tailwind v4's Lightning CSS silently
  // drops the `:has()` rule from the build — so we toggle a class
  // instead. SiteNav is rendered on every page, so this fires on
  // home + every subpage.
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("editorial-canvas");
    return () => html.classList.remove("editorial-canvas");
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/audition-listings")
      .then((r) =>
        r.json().catch(() => ({ listings: [] })) as Promise<{
          listings: Array<{ role_type: OpenRoleType }>;
        }>,
      )
      .then((d) => {
        if (cancelled) return;
        const roleTypes = new Set<OpenRoleType>(
          (d.listings ?? []).map((l) => l.role_type),
        );
        setOpenLabel(deriveOpenLabel(roleTypes, lang));
      })
      .catch(() => {
        if (!cancelled) setOpenLabel("");
      });
    return () => {
      cancelled = true;
    };
  }, [pathname, lang]);

  // ── Scroll spy ────────────────────────────────────
  // rAF-throttled scroll listener instead of IntersectionObserver: gives us
  // the same "active section follows the centerline" behavior, but fires
  // on every scroll tick so the marker animation always tracks the user's
  // actual position — IO can be drowsy in some environments (notably some
  // headless browsers) and we want this to feel taut.
  useEffect(() => {
    if (!isHome) {
      setActiveId(null);
      return;
    }
    // All four sectionIds have a matching element on the home: #issue,
    // #films, #cast are anchor sections, and #careers is a teaser band
    // that links out to the full /careers page. With careers in the
    // list the rail highlights "04 채용" as the user scrolls past it.
    const ids: NavItem["sectionId"][] = ["issue", "films", "cast", "careers"];

    // Sections can declare themselves as "still part of nav item X" via
    // `data-nav-section="X"`. Used by the SHORTS section which is its own
    // <section> but should keep "02 영상" lit because shorts are videos too.
    type ResolvedSection = { id: NavItem["sectionId"]; el: HTMLElement };
    const resolveSections = (): ResolvedSection[] => {
      const out: ResolvedSection[] = [];
      for (const id of ids) {
        const primary = document.getElementById(id);
        if (primary) out.push({ id, el: primary });
        const proxies = document.querySelectorAll<HTMLElement>(
          `[data-nav-section="${id}"]`,
        );
        proxies.forEach((el) => {
          if (el !== primary) out.push({ id, el });
        });
      }
      return out;
    };

    let frame = 0;
    const compute = () => {
      frame = 0;
      // Centerline: 40% down the viewport. `getBoundingClientRect` gives us
      // viewport-relative Y, so we compare against `viewportH * 0.4` directly
      // — no need to add scrollY. (`offsetTop` is relative to the nearest
      // positioned ancestor, which here is the `<main>` we just padded, so
      // it doesn't match document scroll. Stick with rect math.)
      const centerY = window.innerHeight * 0.4;
      let best: NavItem["sectionId"] | null = null;
      let bestDist = Infinity;
      for (const { id, el } of resolveSections()) {
        const rect = el.getBoundingClientRect();
        const dist =
          centerY < rect.top
            ? rect.top - centerY
            : centerY > rect.bottom
              ? centerY - rect.bottom
              : 0;
        if (dist < bestDist) {
          bestDist = dist;
          best = id;
        }
      }
      // Only claim active when the centerline is actually inside a section.
      // Above the first section / between two big gaps, leave it unmarked.
      setActiveId(bestDist === 0 ? best : null);
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(compute);
    };

    compute(); // initial
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [isHome, pathname]);

  // Route-based active fallback for non-home pages.
  const routeId: NavItem["sectionId"] | null = (() => {
    const match = NAV.find(
      (n) => n.routeMatch && pathname.startsWith(n.routeMatch),
    );
    return match?.sectionId ?? null;
  })();
  const effectiveActive = isHome ? activeId : routeId;

  // Close mobile menu when route changes.
  const prevPath = useRef(pathname);
  useEffect(() => {
    if (prevPath.current !== pathname) {
      setMobileOpen(false);
      prevPath.current = pathname;
    }
  }, [pathname]);

  return (
    <>
      {/* ─────────────────────────────────────────────────
          Desktop side rail (lg+) — HOME ONLY.
          On `/*` subpages we render only the compact top bar below
          (which has a back arrow + brand + hamburger menu) so the
          subpage feels like content, not sub-nav. The hamburger still
          exposes the full nav list as an overlay.
          ───────────────────────────────────────────────── */}
      {/* Background is fully transparent (no blur, no border, no surface) so
          the rail reads as a margin gutter of the same cream page rather than
          a separate panel docked to the left. The page's <main> still adds
          `lg:pl-56` to reserve the gutter — content slides under nothing
          here, since there's no surface to slide under. */}
      {/* Subpage handling: don't render the rail at all. The `hidden`
          attribute alone isn't enough because `lg:flex` overrides
          `[hidden] { display: none }` at the lg breakpoint, so the rail
          would still appear on desktop. Skipping the element is also
          better for accessibility (no off-screen focusable links) and
          keeps the DOM lighter on detail views. */}
      {isHome && (
      <aside
        aria-label={lang === "en" ? "Main menu" : "주 메뉴"}
        className="hidden lg:flex fixed top-0 left-0 bottom-0 w-56 z-40 flex-col justify-between py-9 pl-7 pr-6"
      >
        {/* Brand — gentle hover wiggle:
              - chip rotates -6° and scales up 5% (eases out for a
                soft "pop")
              - wordmark slides 2px to the right
              Both share the same group/brand hover scope so they
              animate in sync. */}
        <Link
          href="/"
          className="group/brand flex items-center gap-3 focus:outline-none"
          aria-label={lang === "en" ? "CheezeFilm home" : "치즈필름 홈으로"}
        >
          <span className="inline-flex w-10 h-10 rounded-2xl bg-cheeze-purple overflow-hidden transition-transform duration-300 ease-out group-hover/brand:-rotate-6 group-hover/brand:scale-105">
            <Image
              src="/cheeze-logo.png"
              alt=""
              width={40}
              height={40}
              className="w-full h-full object-cover"
              priority
            />
          </span>
          <span className="text-[15px] font-bold text-cheeze-ink tracking-tight transition duration-300 ease-out group-hover/brand:translate-x-0.5 group-hover/brand:text-cheeze-purple-deep">
            치즈필름
          </span>
        </Link>

        {/* Nav list — editorial table of contents.
            Earlier version wrapped the active item in a rounded purple
            pill and stacked numbers + KO + EN labels three-up. That
            reads like a SaaS dashboard sidebar. The film studio reads
            more like a magazine TOC: a column of plain rows, a thin
            vertical bar marking the active line, and only the active
            number lit in brand purple. No pill, no secondary label,
            no surface noise — the type is the design. */}
        <nav>
          <ol>
            {NAV.map((item) => {
              const active = effectiveActive === item.sectionId;
              const isHash = item.href.includes("#");
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    prefetch
                    // `data-no-vt` opts out of the full-page slide PageTransition
                    // wraps internal navigations in. The rail clicks are local
                    // anchor presses — sliding the whole viewport for them
                    // adds 300–600ms of perceived lag before the user lands.
                    data-no-vt
                    onClick={
                      isHash && isHome
                        ? (e) => {
                            const id = item.href.split("#")[1];
                            e.preventDefault();
                            if (id === "top") {
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            } else {
                              const el = document.getElementById(id);
                              if (!el) return;
                              el.scrollIntoView({
                                behavior: "smooth",
                                block: "start",
                              });
                            }
                            history.replaceState(null, "", item.href);
                          }
                        : undefined
                    }
                    className={`group/nav relative flex items-baseline gap-4 py-2.5 text-[15px] tracking-tight transition-colors ${
                      active
                        ? "text-cheeze-ink font-semibold"
                        : "text-toss-500 hover:text-cheeze-ink font-medium"
                    }`}
                  >
                    <LinkPending />
                    {/* Active marker — a single 1px vertical hairline
                        on the left edge. Animates in with a scale-Y
                        so the eye sees the cursor "land" on the line
                        instead of a block flipping on/off. */}
                    <span
                      aria-hidden
                      className={`absolute -left-3 top-1/2 -translate-y-1/2 w-px h-5 bg-cheeze-purple transition-transform duration-300 origin-center ${
                        active ? "scale-y-100" : "scale-y-0"
                      }`}
                    />
                    <span
                      className={`text-[11px] font-mono tabular-nums transition-colors ${
                        active ? "text-cheeze-purple" : "text-toss-300 group-hover/nav:text-toss-500"
                      }`}
                    >
                      {item.num}
                    </span>
                    <span>
                      {lang === "en" ? item.labelEn : item.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Bottom CTA — film clapper card.
            Previous pass had the status line wrapping ("중" hanging
            on its own row) because tracking-[0.3em] on Korean blew
            the column out. The redo:
              - drops the wide tracking (Korean doesn't need it)
              - uses a shorter status label (deriveOpenLabel above)
              - replaces the ring outline with a brand-yellow left
                strip — the signature clapper/film bookmark mark
              - tightens padding so the card reads as a single
                confident block, not a generic soft pill
              - the action label sits at the bottom in display weight,
                arrow drifts on hover */}
        <div className="space-y-5">
          <Link
            href="/support"
            className="group/cta relative block overflow-hidden rounded-xl bg-cheeze-purple-deep hover:bg-cheeze-purple transition-colors"
          >
            {/* Film bookmark — solid brand-yellow strip down the left
                edge. Reads as a clapperboard slate / film perforation
                mark. Slightly extends on hover for a touch of life. */}
            <span
              aria-hidden
              className="absolute left-0 top-0 bottom-0 w-1 bg-cheeze-yellow group-hover/cta:w-1.5 transition-[width] duration-300"
            />
            <div className="pl-5 pr-4 py-3.5">
              {openLabel && (
                <div className="flex items-center gap-1.5 text-[11px] text-cheeze-cream/80 whitespace-nowrap">
                  <span
                    aria-hidden
                    className="block w-1.5 h-1.5 rounded-full bg-cheeze-yellow cta-pulse"
                  />
                  {openLabel}
                </div>
              )}
              <div
                className={`flex items-end justify-between gap-2 ${
                  openLabel ? "mt-2" : ""
                }`}
              >
                <span
                  className="text-[18px] leading-none tracking-tight text-cheeze-cream"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {lang === "en"
                    ? (openLabel ? "Apply" : "Apply now")
                    : (openLabel ? "지원하기" : "지원하기")}
                </span>
                <span
                  aria-hidden
                  className="text-cheeze-yellow text-[16px] leading-none transition-transform duration-300 group-hover/cta:translate-x-1"
                >
                  →
                </span>
              </div>
            </div>
          </Link>

          <div className="flex items-center justify-between gap-3 pt-1">
            {/* Tracked-uppercase text labels ("YouTube · IG") replaced
                with brand glyphs — the wordmarks were doing the same
                job a 20px icon does, twice over, and the row reads
                cleaner with just the recognisable shapes. `aria-label`
                on each anchor preserves the link's meaning for AT. */}
            <div className="flex items-center gap-1">
              <a
                href="https://www.youtube.com/@CheezeFilmz"
                target="_blank"
                rel="noreferrer"
                aria-label={lang === "en" ? "YouTube channel" : "유튜브 채널"}
                className="inline-flex w-9 h-9 items-center justify-center rounded-full text-cheeze-olive hover:text-cheeze-ink hover:bg-toss-50 transition-colors"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
                  <path fill="currentColor" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
                  <path fill="var(--cheeze-cream)" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>
              <a
                href="https://www.instagram.com/cheezefilm.official/"
                target="_blank"
                rel="noreferrer"
                aria-label={lang === "en" ? "Instagram profile" : "인스타그램 프로필"}
                className="inline-flex w-9 h-9 items-center justify-center rounded-full text-cheeze-olive hover:text-cheeze-ink hover:bg-toss-50 transition-colors"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none" />
                </svg>
              </a>
            </div>
            {/* Language toggle — sits at the bottom of the rail next
                to the social links. Tiny KO/EN pill, writes the
                cf_lang cookie + refreshes the route via RSC. */}
            <LangToggle lang={lang} />
          </div>
        </div>
      </aside>
      )}

      {/* ─────────────────────────────────────────────────
          Compact top bar — always on mobile, also on lg+ for subpages
          since the desktop rail only renders on the home route. On home
          the rail is the navigation; on subpages this bar takes over.
          ───────────────────────────────────────────────── */}
      <header
        className={`sticky top-0 z-40 bg-cheeze-cream/92 backdrop-blur border-b border-cheeze-purple-deep/15 ${
          isHome ? "lg:hidden" : ""
        }`}
      >
        <div className="mx-auto max-w-[100rem] px-5 lg:px-8 py-3.5 flex items-center justify-between gap-3">
          {/* Brand link — on a subpage this also serves as "← back home". */}
          <Link
            href="/"
            className="flex items-center gap-3 focus:outline-none group/back"
            aria-label={
              lang === "en"
                ? (isHome ? "CheezeFilm home" : "← Back to CheezeFilm home")
                : (isHome ? "치즈필름 홈으로" : "← 치즈필름 홈으로 돌아가기")
            }
          >
            {!isHome && (
              <span
                aria-hidden
                className="text-cheeze-purple-deep text-lg group-hover/back:-translate-x-0.5 transition-transform"
              >
                ←
              </span>
            )}
            <span className="inline-flex w-9 h-9 rounded-2xl bg-cheeze-purple overflow-hidden transition-transform duration-300 ease-out group-hover/back:-rotate-6 group-hover/back:scale-105">
              <Image
                src="/cheeze-logo.png"
                alt=""
                width={36}
                height={36}
                className="w-full h-full object-cover"
              />
            </span>
            <div className="flex flex-col leading-none transition duration-300 ease-out group-hover/back:translate-x-0.5">
              <span className="font-bold text-sm tracking-tight text-cheeze-ink group-hover/back:text-cheeze-purple-deep transition-colors">
                치즈필름
              </span>
              <span className="text-[9px] tracking-[0.3em] text-cheeze-olive uppercase mt-0.5">
                Editorial 02
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            {/* Hamburger: square rounded chip with three even lines. Soft
                grey fill on hover/active, no bordered look. */}
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-cheeze-ink hover:bg-toss-50 active:bg-toss-100 transition-colors"
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              aria-label={lang === "en" ? "Menu" : "메뉴"}
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
            {/* 지원 CTA: matches the home hero's dark rounded button
                pattern. Sentence-case Korean, single arrow glyph. */}
            <Link
              href="/support"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cheeze-ink text-white text-[13px] font-semibold hover:bg-cheeze-ink-soft transition-colors"
            >
              지원하기
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>

        {/* Collapsible mobile nav — same editorial column layout as
            the desktop rail (hairline divisions, no painted active
            chip, secondary label dropped). Active row sits in ink
            with a small left dot; inactive rows in muted grey. */}
        <nav
          id="mobile-menu"
          hidden={!mobileOpen}
          className="border-t border-cheeze-ink/10 bg-cheeze-cream/95"
        >
          <ol className="px-5 divide-y divide-cheeze-ink/10">
            {NAV.map((item) => {
              const active = effectiveActive === item.sectionId;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`relative flex items-baseline gap-4 py-3.5 transition-colors ${
                      active
                        ? "text-cheeze-ink font-semibold"
                        : "text-toss-500 font-medium"
                    }`}
                  >
                    {active && (
                      <span
                        aria-hidden
                        className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-cheeze-purple"
                      />
                    )}
                    <span
                      className={`text-[11px] font-mono tabular-nums ${
                        active ? "text-cheeze-purple" : "text-toss-300"
                      }`}
                    >
                      {item.num}
                    </span>
                    <span className="text-[15px] tracking-tight">
                      {lang === "en" ? item.labelEn : item.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </nav>
      </header>
    </>
  );
}
