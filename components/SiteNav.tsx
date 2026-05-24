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
 *  We treat anything that's not "staff" as an audition role for label
 *  purposes; if both buckets are open we show both. */
function deriveOpenLabel(roleTypes: Set<OpenRoleType>, lang: Lang): string {
  const hasStaff = roleTypes.has("staff");
  const hasAudition =
    roleTypes.has("lead") ||
    roleTypes.has("support") ||
    roleTypes.has("extra");
  if (lang === "en") {
    if (hasStaff && hasAudition) return "Casting & hiring";
    if (hasAudition) return "Casting now";
    if (hasStaff) return "Hiring now";
  } else {
    if (hasStaff && hasAudition) return "오디션 · 스태프 모집 중";
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

        {/* Nav list with scroll-spy marker.
            Active item = full-ink (looks black); inactive = muted olive that
            reads as gray on the cream background. Labels are display-sized
            so the rail anchors the page rather than acting as a chrome strip. */}
        <nav className="-mx-2">
          <ol className="space-y-2">
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
                    // In-page hash links (every rail item on the home spread
                    // now points at #issue / #films / #cast / #careers). We
                    // animate the scroll instead of teleporting so the user
                    // *sees* the page travelling — the rail is part of the
                    // spread, not a route switcher.
                    onClick={
                      isHash && isHome
                        ? (e) => {
                            const id = item.href.split("#")[1];
                            e.preventDefault();
                            // `#top` is a sentinel for the 01 소개 item —
                            // scroll to the very top of the page rather
                            // than to an anchor element. Anything else
                            // tries to find a matching id.
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
                    className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[15px] font-semibold transition-all ${
                      active
                        ? "bg-cheeze-purple/10 text-cheeze-purple-deep"
                        : "text-toss-500 hover:bg-toss-50 hover:text-cheeze-ink"
                    }`}
                  >
                    <LinkPending />
                    <span
                      className={`text-[11px] font-mono tabular-nums transition-colors ${
                        active ? "text-cheeze-purple" : "text-toss-300"
                      }`}
                    >
                      {item.num}
                    </span>
                    <span className="flex-1">
                      {lang === "en" ? item.labelEn : item.label}
                    </span>
                    <span
                      aria-hidden
                      className={`text-[10px] tracking-wider uppercase transition-opacity ${
                        active ? "opacity-60" : "opacity-0"
                      }`}
                    >
                      {lang === "en" ? item.label : item.labelEn}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* CTA + social row.
            Toss-style: clean rounded card, one small status label, one
            clear action. No yellow stripe, no film-perf dots, no mono
            sub-label — those were over-decorating a 220px-wide button.
            The whole rail is already editorial; the CTA's job is just
            to feel inviting and tappable. */}
        <div className="space-y-4">
          <Link
            href="/support"
            className="group/cta block rounded-2xl bg-cheeze-purple-deep text-cheeze-cream hover:bg-cheeze-purple transition-colors px-4 py-3.5"
          >
            {/* Status row — only renders when we have at least one open
                listing. The label reflects the actual mix of role types
                that are open right now (오디션 / 스태프 / 둘 다), so
                we never tell the visitor "오디션 모집 중" when only
                staff positions are actually accepting. */}
            {openLabel && (
              <div className="flex items-center gap-1.5 text-[11px] text-cheeze-cream/75">
                <span
                  aria-hidden
                  className="block w-1.5 h-1.5 rounded-full bg-cheeze-yellow cta-pulse"
                />
                {openLabel}
              </div>
            )}

            {/* Action row */}
            <div
              className={`flex items-center justify-between gap-2 ${
                openLabel ? "mt-1" : ""
              }`}
            >
              <span className="text-[15px] font-semibold tracking-tight text-cheeze-cream">
                {lang === "en"
                  ? (openLabel ? "Apply" : "Go to apply page")
                  : (openLabel ? "지원하기" : "지원 페이지로")}
              </span>
              <span
                aria-hidden
                className="text-cheeze-cream/80 text-[15px] leading-none transition-transform duration-300 group-hover/cta:translate-x-1"
              >
                →
              </span>
            </div>
          </Link>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-[10px] tracking-[0.3em] uppercase">
              <a
                href="https://www.youtube.com/@CheezeFilmz"
                target="_blank"
                rel="noreferrer"
                className="text-cheeze-olive hover:text-cheeze-purple transition-colors"
              >
                YouTube
              </a>
              <span className="text-cheeze-olive/30">·</span>
              <a
                href="https://www.instagram.com/cheezefilm.official/"
                target="_blank"
                rel="noreferrer"
                className="text-cheeze-olive hover:text-cheeze-purple transition-colors"
              >
                IG
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

        {/* Collapsible nav row */}
        <nav
          id="mobile-menu"
          hidden={!mobileOpen}
          className="border-t border-cheeze-purple-deep/15 bg-cheeze-cream/95"
        >
          <ol className="px-5 py-2 divide-y divide-cheeze-purple-deep/10">
            {NAV.map((item) => {
              const active = effectiveActive === item.sectionId;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-baseline justify-between py-3 transition-colors ${
                      active
                        ? "text-cheeze-purple-deep"
                        : "text-cheeze-ink-soft"
                    }`}
                  >
                    <span className="flex items-baseline gap-3">
                      <span className="font-mono text-[10px] tracking-wider tabular-nums text-cheeze-olive/70">
                        {item.num}
                      </span>
                      <span
                        className="text-xl"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {lang === "en" ? item.labelEn : item.label}
                      </span>
                    </span>
                    <span className="text-[9px] tracking-[0.3em] uppercase text-cheeze-olive/60">
                      {lang === "en" ? item.label : item.labelEn}
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
