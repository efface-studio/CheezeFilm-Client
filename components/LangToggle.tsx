"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { COOKIE_NAME, type Lang } from "@/lib/i18n";

/**
 * Small KO ⇄ EN toggle for the site nav.
 *
 * Writes the `cf_lang` cookie client-side, then calls `router.refresh()`
 * so server components re-render with the new lang. No URL changes —
 * the toggle is a sticky preference, not a route parameter.
 *
 * Cookie is set with `max-age=1 year` + `path=/` so it persists across
 * visits and applies to every route. `SameSite=Lax` is the safe default
 * (still sent on same-site navigation, blocked from cross-site POST).
 */
export default function LangToggle({ lang }: { lang: Lang }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setLang(next: Lang) {
    if (next === lang) return;
    // 1 year, root path, lax samesite. No `Secure` flag because the
    // toggle has to work on http://localhost too — the cookie is
    // user-preference, not auth, so it's fine to skip.
    document.cookie = `${COOKIE_NAME}=${next}; max-age=${60 * 60 * 24 * 365}; path=/; samesite=lax`;
    // router.refresh() re-fetches the current route's RSC payload —
    // server components re-render with the new cookie, no full page
    // reload (which would lose scroll position, dismiss any open
    // modals, etc.).
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div
      className={`inline-flex items-center rounded-full bg-toss-100 p-0.5 text-[11px] font-bold tracking-widest uppercase transition-opacity ${
        pending ? "opacity-60" : ""
      }`}
      aria-label="언어 선택"
    >
      <button
        type="button"
        onClick={() => setLang("ko")}
        className={`px-2.5 py-1 rounded-full transition-colors ${
          lang === "ko"
            ? "bg-white text-cheeze-ink shadow-sm"
            : "text-cheeze-ink-soft/70 hover:text-cheeze-ink"
        }`}
        aria-pressed={lang === "ko"}
      >
        KO
      </button>
      <button
        type="button"
        onClick={() => setLang("en")}
        className={`px-2.5 py-1 rounded-full transition-colors ${
          lang === "en"
            ? "bg-white text-cheeze-ink shadow-sm"
            : "text-cheeze-ink-soft/70 hover:text-cheeze-ink"
        }`}
        aria-pressed={lang === "en"}
      >
        EN
      </button>
    </div>
  );
}
