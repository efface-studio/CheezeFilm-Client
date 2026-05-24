"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type TabKey =
  | "dashboard"
  | "issue"
  | "listings"
  | "auditions"
  | "fan"
  | "members"
  | "content";

type Tab = {
  key: TabKey;
  label: string;
  /** Inline-SVG icon — monochrome, 16×16, currentColor. */
  icon: React.ReactNode;
  /** Section label in the sidebar — groups related items together. */
  group: "overview" | "studio" | "system";
};

const ICONS = {
  dashboard: (
    <svg viewBox="0 0 16 16" className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="2" y="2" width="5" height="6" rx="1" />
      <rect x="9" y="2" width="5" height="3" rx="1" />
      <rect x="9" y="7" width="5" height="7" rx="1" />
      <rect x="2" y="10" width="5" height="4" rx="1" />
    </svg>
  ),
  listings: (
    <svg viewBox="0 0 16 16" className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" />
      <path d="M5 6h6M5 9h6M5 12h3" strokeLinecap="round" />
    </svg>
  ),
  auditions: (
    <svg viewBox="0 0 16 16" className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="8" cy="6" r="2.5" />
      <path d="M3 14c0-2.8 2.2-5 5-5s5 2.2 5 5" strokeLinecap="round" />
    </svg>
  ),
  fan: (
    <svg viewBox="0 0 16 16" className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="2" y="3.5" width="12" height="9" rx="1.5" />
      <path d="M2.5 4.5L8 9l5.5-4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  members: (
    <svg viewBox="0 0 16 16" className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="6" cy="6" r="2.2" />
      <circle cx="11.5" cy="6.5" r="1.8" />
      <path d="M2 13c0-2 1.8-3.6 4-3.6s4 1.6 4 3.6" strokeLinecap="round" />
      <path d="M10 12.5c0-1.5 1.3-2.6 2.5-2.6s2 0.8 2 2" strokeLinecap="round" />
    </svg>
  ),
  content: (
    <svg viewBox="0 0 16 16" className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 13l2-1 7.5-7.5a1.5 1.5 0 00-2-2L3 10v3z" strokeLinejoin="round" />
    </svg>
  ),
  issue: (
    <svg viewBox="0 0 16 16" className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="2" y="3" width="12" height="10" rx="1" />
      <path d="M2 6h12" />
      <circle cx="5" cy="9.5" r="0.8" fill="currentColor" />
      <circle cx="8" cy="9.5" r="0.8" fill="currentColor" />
      <circle cx="11" cy="9.5" r="0.8" fill="currentColor" />
    </svg>
  ),
} as const;

const TABS: Tab[] = [
  { key: "dashboard", label: "대시보드", icon: ICONS.dashboard, group: "overview" },
  { key: "auditions", label: "오디션", icon: ICONS.auditions, group: "studio" },
  { key: "fan", label: "응원 메시지", icon: ICONS.fan, group: "studio" },
  { key: "listings", label: "지원 공고", icon: ICONS.listings, group: "studio" },
  { key: "members", label: "멤버 관리", icon: ICONS.members, group: "studio" },
  { key: "issue", label: "이번 호 표지", icon: ICONS.issue, group: "system" },
  { key: "content", label: "사이트 콘텐츠", icon: ICONS.content, group: "system" },
];

const GROUP_LABELS: Record<Tab["group"], string> = {
  overview: "Overview",
  studio: "Studio",
  system: "System",
};

export default function AdminShell({
  children,
  active,
  username,
  badges,
}: {
  children: React.ReactNode;
  active: TabKey;
  username: string;
  badges?: { auditions?: number; fan?: number };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the user menu on outside click / Esc — same pattern as
  // ExportMenu in AdminListToolbar.
  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  async function logout() {
    setBusy(true);
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  const activeTab = TABS.find((t) => t.key === active);
  const groups: Tab["group"][] = ["overview", "studio", "system"];
  const totalUnread =
    (badges?.auditions ?? 0) + (badges?.fan ?? 0);

  return (
    <div className="admin-shell font-pretendard min-h-screen bg-zinc-50 text-zinc-900">
      {/* ── Mobile scrim ────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-zinc-900/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────── */}
      <aside
        className={`${
          mobileOpen ? "fixed inset-y-0 left-0 z-50 flex" : "hidden lg:flex"
        } lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 h-screen w-[232px] bg-zinc-950 text-zinc-100 flex-col`}
      >
        {/* Brand row — chip + title. Denser than before (h-14 row,
            small chip, single text line) so it visually matches the
            nav item rhythm below it. */}
        <div className="h-14 px-3 flex items-center gap-2.5 border-b border-zinc-800/70 flex-shrink-0">
          <span className="inline-flex w-7 h-7 rounded-md bg-purple-600 overflow-hidden shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/cheeze-logo.png"
              alt="CheezeFilm"
              className="w-full h-full object-cover"
            />
          </span>
          <div className="min-w-0">
            <div className="text-[13px] font-bold leading-none truncate">치즈필름</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 mt-1 leading-none">
              Studio Admin
            </div>
          </div>
        </div>

        {/* Nav — grouped sections, denser rows (h-8) with sharper
            active-state (pill-rounded fill, accent left-bar). */}
        <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-4">
          {groups.map((group) => {
            const groupTabs = TABS.filter((t) => t.group === group);
            if (groupTabs.length === 0) return null;
            return (
              <div key={group}>
                <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-600">
                  {GROUP_LABELS[group]}
                </div>
                <ul className="space-y-0.5">
                  {groupTabs.map((t) => {
                    const isActive = t.key === active;
                    const href = t.key === "dashboard" ? "/admin" : `/admin?tab=${t.key}`;
                    const badge =
                      t.key === "auditions" ? badges?.auditions :
                      t.key === "fan" ? badges?.fan : undefined;
                    return (
                      <li key={t.key}>
                        <Link
                          href={href}
                          onClick={() => setMobileOpen(false)}
                          className={`group relative flex items-center justify-between gap-2 pl-3 pr-2 h-8 rounded-md text-[13px] font-medium transition-colors ${
                            isActive
                              ? "bg-zinc-800/90 text-white"
                              : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                          }`}
                          aria-current={isActive ? "page" : undefined}
                        >
                          {isActive && (
                            <span
                              className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r-full bg-purple-400"
                              aria-hidden
                            />
                          )}
                          <span className="flex items-center gap-2.5 min-w-0">
                            <span className={isActive ? "text-purple-300" : "text-zinc-500 group-hover:text-zinc-300"}>
                              {t.icon}
                            </span>
                            <span className="truncate">{t.label}</span>
                          </span>
                          {typeof badge === "number" && badge > 0 && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center tabular-nums ${
                                isActive
                                  ? "bg-purple-500 text-white"
                                  : "bg-purple-500/15 text-purple-300"
                              }`}
                            >
                              {badge > 99 ? "99+" : badge}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        {/* Bottom — site link + small user identity strip (full
            user-menu is in the top bar). */}
        <div className="px-2 py-2.5 border-t border-zinc-800/70 space-y-0.5">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-2 px-3 h-8 text-[12px] font-medium text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200 rounded-md"
          >
            <svg viewBox="0 0 16 16" className="w-[13px] h-[13px]" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M6 3H4a1 1 0 00-1 1v8a1 1 0 001 1h8a1 1 0 001-1v-2M9 3h4v4M6.5 9.5L13 3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            메인 사이트 열기
          </Link>
          <div className="flex items-center gap-2 px-3 h-9 rounded-md">
            <span className="w-6 h-6 rounded-full bg-purple-600/90 text-white text-[11px] font-bold grid place-items-center uppercase shrink-0">
              {username.charAt(0)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-semibold text-zinc-200 truncate leading-tight">
                {username}
              </div>
              <div className="text-[10px] text-zinc-500 leading-tight">Administrator</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main column ─────────────────────────────── */}
      <div className="min-w-0 flex flex-col lg:ml-[232px]">
        {/* ── Top app bar ───────────────────────── */}
        <header className="sticky top-0 z-30 h-14 border-b border-zinc-200 bg-white/95 backdrop-blur">
          <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-3">
            {/* Left: mobile menu + breadcrumb */}
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden w-9 h-9 -ml-1.5 rounded-md hover:bg-zinc-100 grid place-items-center text-zinc-700"
                aria-label="메뉴"
              >
                <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M2 4h12M2 8h12M2 12h12" strokeLinecap="round" />
                </svg>
              </button>
              <nav className="flex items-center gap-1.5 text-[13px] min-w-0" aria-label="현재 위치">
                <span className="font-semibold text-zinc-400 hidden sm:inline">관리자</span>
                <span className="text-zinc-300 hidden sm:inline" aria-hidden>/</span>
                <span className="font-bold text-zinc-900 truncate">
                  {activeTab?.label ?? "대시보드"}
                </span>
              </nav>
            </div>

            {/* Right: search / notifications / user menu */}
            <div className="flex items-center gap-1.5">
              {/* Search — wired to ⌘K placeholder; functional search
                  lives per-tab via AdminListToolbar. This is the global
                  affordance you expect in a real admin shell. */}
              <button
                type="button"
                onClick={() => {
                  // Best-effort: focus the per-tab search input if visible.
                  const el = document.querySelector<HTMLInputElement>("input[type=search]");
                  if (el) el.focus();
                }}
                className="hidden md:inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-white hover:border-zinc-300 text-[12px] text-zinc-500 transition-colors w-72"
                aria-label="검색"
              >
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="7" cy="7" r="4.5" />
                  <path d="M10.5 10.5L14 14" strokeLinecap="round" />
                </svg>
                <span className="flex-1 text-left">검색</span>
                <kbd className="text-[10px] font-semibold text-zinc-400 bg-white border border-zinc-200 rounded px-1.5 py-0.5 tabular-nums">
                  ⌘ K
                </kbd>
              </button>

              {/* Notification bell — currently a passive indicator that
                  links the user to whichever inbox has unread items. */}
              <NotificationBell
                pendingAuditions={badges?.auditions ?? 0}
                unreadFan={badges?.fan ?? 0}
                total={totalUnread}
              />

              {/* User menu */}
              <div ref={menuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  className={`flex items-center gap-2 h-9 pl-1 pr-2 rounded-lg border transition-colors ${
                    menuOpen
                      ? "border-zinc-300 bg-white"
                      : "border-transparent hover:bg-zinc-100"
                  }`}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  <span className="w-7 h-7 rounded-full bg-purple-600 text-white text-[12px] font-bold grid place-items-center uppercase shrink-0">
                    {username.charAt(0)}
                  </span>
                  <span className="hidden sm:flex items-center gap-1 text-[12px] font-semibold text-zinc-700">
                    <span className="truncate max-w-[120px]">{username}</span>
                    <svg viewBox="0 0 16 16" className={`w-3 h-3 text-zinc-400 transition-transform ${menuOpen ? "rotate-180" : ""}`} fill="currentColor">
                      <path d="M4 6l4 5 4-5z" />
                    </svg>
                  </span>
                </button>
                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-2 w-60 bg-white rounded-xl shadow-lg border border-zinc-100 overflow-hidden z-30 origin-top-right"
                  >
                    <div className="px-3 py-3 border-b border-zinc-100">
                      <div className="text-[13px] font-bold text-zinc-900 truncate">
                        {username}
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">
                        Administrator · 치즈필름 Studio
                      </div>
                    </div>
                    <div className="py-1">
                      <Link
                        href="/"
                        target="_blank"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-3 h-8 text-[13px] text-zinc-700 hover:bg-zinc-50"
                        role="menuitem"
                      >
                        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="1.6">
                          <path d="M6 3H4a1 1 0 00-1 1v8a1 1 0 001 1h8a1 1 0 001-1v-2M9 3h4v4M6.5 9.5L13 3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        메인 사이트 열기
                      </Link>
                      <Link
                        href="/admin?tab=content"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-3 h-8 text-[13px] text-zinc-700 hover:bg-zinc-50"
                        role="menuitem"
                      >
                        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="1.6">
                          <path d="M3 13l2-1 7.5-7.5a1.5 1.5 0 00-2-2L3 10v3z" strokeLinejoin="round" />
                        </svg>
                        사이트 콘텐츠 편집
                      </Link>
                    </div>
                    <div className="border-t border-zinc-100 py-1">
                      <button
                        type="button"
                        onClick={logout}
                        disabled={busy}
                        className="flex items-center gap-2 px-3 h-8 text-[13px] text-rose-600 hover:bg-rose-50 w-full disabled:opacity-60"
                        role="menuitem"
                      >
                        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
                          <path d="M10 4V3a1 1 0 00-1-1H3a1 1 0 00-1 1v10a1 1 0 001 1h6a1 1 0 001-1v-1M6 8h8m0 0L11 5m3 3l-3 3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {busy ? "로그아웃 중…" : "로그아웃"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-5 sm:p-7 lg:p-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

/**
 * Notification bell — links to whichever inbox has unread items
 * (auditions take priority since they're action-required). A small red
 * dot indicates there's at least one unread thing. Tooltip on hover
 * lists the breakdown.
 */
function NotificationBell({
  pendingAuditions,
  unreadFan,
  total,
}: {
  pendingAuditions: number;
  unreadFan: number;
  total: number;
}) {
  const has = total > 0;
  const href = pendingAuditions > 0 ? "/admin?tab=auditions" : "/admin?tab=fan";
  const title = has
    ? `대기 ${pendingAuditions}건 · 안 읽음 ${unreadFan}건`
    : "새 알림이 없어요";
  return (
    <Link
      href={href}
      title={title}
      aria-label={title}
      className="relative w-9 h-9 rounded-lg hover:bg-zinc-100 grid place-items-center text-zinc-500 hover:text-zinc-900 transition-colors"
    >
      <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M8 2v1.2M3.5 7a4.5 4.5 0 119 0c0 3 1 4 1 4h-11s1-1 1-4z" strokeLinejoin="round" strokeLinecap="round" />
        <path d="M6.5 13.5a1.5 1.5 0 003 0" strokeLinecap="round" />
      </svg>
      {has && (
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
      )}
    </Link>
  );
}
