"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { flushSync } from "react-dom";

/**
 * Page transition with two complementary mechanisms:
 *
 *   1. **View Transitions API** (Chrome/Edge/Safari 17.4+)
 *      A global click handler intercepts internal anchor navigations and
 *      wraps `router.push` in `document.startViewTransition`. Combined with
 *      the `::view-transition-old/new(root)` CSS in globals.css, the whole
 *      viewport literally slides — outgoing page slides out to the left,
 *      incoming page slides in from the right.
 *
 *   2. **CSS enter fallback** (everywhere else, e.g. Firefox)
 *      A keyed wrapper around `children` re-mounts on pathname change and
 *      runs the `.page-slide-in` keyframe so the new page still arrives with
 *      a slide-in feel even when the browser can't do the real transition.
 */
export default function PageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // Hijack same-origin clicks → use View Transitions when available.
  useEffect(() => {
    if (typeof document === "undefined") return;
    type DocWithVT = Document & {
      startViewTransition?: (cb: () => void) => unknown;
    };
    const doc = document as DocWithVT;
    if (typeof doc.startViewTransition !== "function") return;
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    function onClick(e: MouseEvent) {
      // Honour modifier keys + middle-click (open-in-new-tab semantics).
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return;
      if (e.button !== 0) return;

      const target = e.target as Element | null;
      const anchor = target?.closest("a") as HTMLAnchorElement | null;
      if (!anchor) return;
      // Skip external / new-tab / download / hash-only links.
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      // Explicit opt-out — used by the design picker where a fade-only VT
      // collides with React not having flushed the new tree yet.
      if (anchor.hasAttribute("data-no-vt")) return;
      const href = anchor.getAttribute("href");
      if (!href || !href.startsWith("/")) return;
      // Any hash navigation should NEVER use a page transition — the browser
      // should just scroll to the anchor. Covers:
      //   - "/#section"          (same page, root)
      //   - "/v1#story"          (same path with anchor)
      //   - "#hash" alone
      // For cross-path hash (e.g. on /videos, clicking /v1#cast) we let Next.js
      // do the regular navigation without our slide.
      if (href.includes("#")) return;
      if (href === pathname) return;

      // Admin → admin: the dashboard shell stays put (sidebar etc.), so
      // sliding the whole viewport feels like a content swap rather than a
      // real navigation. Let Next.js handle it instantly without any
      // transition; the main content just updates in place.
      const sourceIsAdmin = pathname?.startsWith("/admin") ?? false;
      const destIsAdmin = href.startsWith("/admin");
      if (sourceIsAdmin && destIsAdmin) {
        return; // skip our handler, Next.js Link does its native navigation
      }

      e.preventDefault();
      // `flushSync` forces React to commit `router.push` synchronously
      // inside the view-transition callback. Without it, Next 16 schedules
      // the navigation as a transition update — VT then captures the OLD
      // tree, "completes" the transition before the new tree commits, and
      // the user is stuck on the source page with the URL bar updated but
      // nothing rendered for the destination.
      doc.startViewTransition!(() => {
        flushSync(() => {
          router.push(href);
        });
      });
    }

    // Capture phase: run BEFORE Next.js <Link>'s own onClick so we can call
    // preventDefault and take over the navigation with a view transition.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname, router]);

  // While in the admin shell, don't re-key on every route change — that would
  // re-mount the whole shell and re-run the slide-in keyframe each tab switch.
  // Inside admin the sidebar/header should stay put.
  const inAdmin = pathname?.startsWith("/admin") ?? false;
  return (
    <div
      key={inAdmin ? "__admin-shell__" : pathname}
      className={inAdmin ? "" : "page-slide-in"}
    >
      {children}
    </div>
  );
}
