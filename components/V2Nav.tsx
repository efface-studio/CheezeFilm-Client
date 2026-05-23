"use client";

import Link, { useLinkStatus } from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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
        animation: "v2-link-pending 1s ease-in-out 120ms infinite",
      }}
    />
  );
}

/**
 * V2 navigation — left side rail on lg+, compact top bar on mobile.
 *
 * Replaces the previous full-width horizontal top bar. The side rail
 *  - sits flush against the left edge (no border on desktop, blends into the
 *    cream background via 80%-opacity backdrop blur),
 *  - tracks which section of the page is in view via IntersectionObserver
 *    and animates a yellow marker between nav items so the active section
 *    "moves" smoothly as the user scrolls.
 *
 * The four anchor sections on `/v2` (`#issue`, `#films`, `#cast`, `#contact`)
 * are pre-existing — this component just observes them.
 */

type NavItem = {
  num: string;
  label: string;
  labelEn: string;
  href: string;
  /** ID of the section to scroll-spy against, on `/v2`. */
  sectionId: "issue" | "films" | "cast" | "careers";
  /** Path that should mark this item active when the user is on a child page. */
  routeMatch?: string;
};

const NAV: NavItem[] = [
  { num: "01", label: "소개",   labelEn: "About",   href: "/v2#issue",   sectionId: "issue" },
  { num: "02", label: "영상",   labelEn: "Films",   href: "/v2/videos",  sectionId: "films",  routeMatch: "/v2/videos" },
  { num: "03", label: "멤버",   labelEn: "Cast",    href: "/v2/members", sectionId: "cast",   routeMatch: "/v2/members" },
  // 04 used to be #contact (an anchor on the home page). Replaced with the
  // standalone Careers page — hiring is a separate flow from "send us a fan
  // letter", and giving it its own route lets us link to it externally.
  { num: "04", label: "채용",   labelEn: "Careers", href: "/v2/careers", sectionId: "careers", routeMatch: "/v2/careers" },
];

export default function V2Nav() {
  const pathname = usePathname();
  const isHome = pathname === "/v2";
  const [activeId, setActiveId] = useState<NavItem["sectionId"] | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

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
    // All four sectionIds have a matching element on the V2 home: #issue,
    // #films, #cast are anchor sections, and #careers is a teaser band
    // that links out to the full /v2/careers page. With careers in the
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
          On `/v2/*` subpages we render only the compact top bar below
          (which has a back arrow + brand + hamburger menu) so the
          subpage feels like content, not sub-nav. The hamburger still
          exposes the full nav list as an overlay.
          ───────────────────────────────────────────────── */}
      {/* Background is fully transparent (no blur, no border, no surface) so
          the rail reads as a margin gutter of the same cream page rather than
          a separate panel docked to the left. The page's <main> still adds
          `lg:pl-56` to reserve the gutter — content slides under nothing
          here, since there's no surface to slide under. */}
      <aside
        aria-label="주 메뉴"
        hidden={!isHome}
        className="hidden lg:flex fixed top-0 left-0 bottom-0 w-56 z-40 flex-col justify-between py-9 pl-7 pr-6"
      >
        {/* Brand */}
        <Link
          href="/v2"
          className="group block focus:outline-none"
          aria-label="치즈필름 홈으로"
        >
          <div className="flex items-center gap-3">
            <span className="inline-flex w-11 h-11 rounded-full bg-cheeze-purple overflow-hidden border border-cheeze-purple-deep transition-transform duration-300 ease-out group-hover:-rotate-[8deg] group-hover:scale-105">
              <Image
                src="/cheeze-logo.png"
                alt=""
                width={44}
                height={44}
                className="w-full h-full object-cover"
                priority
              />
            </span>
            <div className="leading-tight">
              <div
                className="text-xl text-cheeze-ink transition-colors group-hover:text-cheeze-purple-deep"
                style={{ fontFamily: "var(--font-display)" }}
              >
                치즈필름
              </div>
              <div className="text-[9px] tracking-[0.35em] uppercase text-cheeze-olive mt-1">
                Editorial 02
              </div>
            </div>
          </div>
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
                    // Hash links on the home page (#issue / #contact) should
                    // jump instantly rather than animate via the browser's
                    // smooth-scroll fallback. We use scrollIntoView with
                    // `behavior: "auto"` for a single-frame focus.
                    onClick={
                      isHash && isHome
                        ? (e) => {
                            const id = item.href.split("#")[1];
                            const el = document.getElementById(id);
                            if (!el) return;
                            e.preventDefault();
                            el.scrollIntoView({
                              behavior: "auto",
                              block: "start",
                            });
                            history.replaceState(null, "", item.href);
                          }
                        : undefined
                    }
                    className={`relative grid grid-cols-[1.6rem_1fr] items-baseline gap-3 px-2 py-2 transition-colors ${
                      active
                        ? "text-cheeze-ink"
                        : "text-cheeze-olive/45 hover:text-cheeze-ink/70"
                    }`}
                  >
                    {/* Yellow marker — width transitions so the highlight
                        feels like it slides between items as activeId moves. */}
                    <span
                      aria-hidden
                      className={`absolute -left-7 top-1/2 -translate-y-1/2 h-px bg-cheeze-yellow transition-all duration-500 ease-out ${
                        active ? "w-7 opacity-100" : "w-2 opacity-30"
                      }`}
                    />
                    {/* Pending state — fires on click before the next page
                        renders. Gives instant feedback on slow dev routes. */}
                    <LinkPending />
                    <span
                      className={`font-mono text-[10px] tracking-wider tabular-nums transition-colors pt-2 ${
                        active ? "text-cheeze-ink/70" : "text-cheeze-olive/40"
                      }`}
                    >
                      {item.num}
                    </span>
                    <span className="flex items-baseline gap-2">
                      <span
                        className="text-3xl leading-none"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {item.label}
                      </span>
                      <span
                        className={`text-[10px] tracking-[0.3em] uppercase transition-colors ${
                          active ? "text-cheeze-ink/55" : "text-cheeze-olive/40"
                        }`}
                      >
                        {item.labelEn}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* CTA + social row */}
        <div className="space-y-3">
          <Link
            href="/v2/support"
            className="group/cta block text-center text-[11px] font-bold tracking-[0.2em] uppercase px-3 py-3 bg-cheeze-purple-deep text-cheeze-yellow hover:bg-cheeze-purple transition-colors"
          >
            오디션 지원{" "}
            <span
              aria-hidden
              className="inline-block transition-transform duration-300 group-hover/cta:translate-x-1"
            >
              →
            </span>
          </Link>
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
        </div>
      </aside>

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
            href="/v2"
            className="flex items-center gap-3 focus:outline-none group/back"
            aria-label={isHome ? "치즈필름 홈으로" : "← 치즈필름 홈으로 돌아가기"}
          >
            {!isHome && (
              <span
                aria-hidden
                className="text-cheeze-purple-deep text-lg group-hover/back:-translate-x-0.5 transition-transform"
              >
                ←
              </span>
            )}
            <span className="inline-flex w-9 h-9 rounded-full bg-cheeze-purple overflow-hidden border border-cheeze-purple-deep">
              <Image
                src="/cheeze-logo.png"
                alt=""
                width={36}
                height={36}
                className="w-full h-full object-cover"
              />
            </span>
            <div className="flex flex-col leading-none">
              <span className="font-bold text-sm tracking-tight">치즈필름</span>
              <span className="text-[9px] tracking-[0.3em] text-cheeze-olive uppercase mt-0.5">
                Editorial 02
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="inline-flex items-center justify-center w-10 h-10 border border-cheeze-purple-deep/30 text-cheeze-purple-deep hover:bg-cheeze-purple-deep/5 transition-colors"
              aria-expanded={mobileOpen}
              aria-controls="v2-mobile-menu"
              aria-label="메뉴"
            >
              <span
                aria-hidden
                className="block w-4 h-px bg-current relative before:absolute before:left-0 before:right-0 before:-top-1.5 before:h-px before:bg-current after:absolute after:left-0 after:right-0 after:top-1.5 after:h-px after:bg-current"
              />
            </button>
            <Link
              href="/v2/support"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-cheeze-purple-deep text-cheeze-yellow text-[11px] font-bold tracking-widest uppercase hover:bg-cheeze-purple transition-colors"
            >
              지원
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>

        {/* Collapsible nav row */}
        <nav
          id="v2-mobile-menu"
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
                        {item.label}
                      </span>
                    </span>
                    <span className="text-[9px] tracking-[0.3em] uppercase text-cheeze-olive/60">
                      {item.labelEn}
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
