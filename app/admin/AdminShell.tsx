"use client";

import Link from "next/link";
import { useState } from "react";
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
  /** Inline-SVG icon — replaces the previous geometric unicode that varied
   *  by font fallback. Each glyph is monochrome, 16×16, currentColor. */
  icon: React.ReactNode;
};

const ICONS = {
  dashboard: (
    <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="2" y="2" width="5" height="6" rx="1" />
      <rect x="9" y="2" width="5" height="3" rx="1" />
      <rect x="9" y="7" width="5" height="7" rx="1" />
      <rect x="2" y="10" width="5" height="4" rx="1" />
    </svg>
  ),
  listings: (
    <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" />
      <path d="M5 6h6M5 9h6M5 12h3" strokeLinecap="round" />
    </svg>
  ),
  auditions: (
    <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="8" cy="6" r="2.5" />
      <path d="M3 14c0-2.8 2.2-5 5-5s5 2.2 5 5" strokeLinecap="round" />
    </svg>
  ),
  fan: (
    <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="2" y="3.5" width="12" height="9" rx="1.5" />
      <path d="M2.5 4.5L8 9l5.5-4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  members: (
    <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="6" cy="6" r="2.2" />
      <circle cx="11.5" cy="6.5" r="1.8" />
      <path d="M2 13c0-2 1.8-3.6 4-3.6s4 1.6 4 3.6" strokeLinecap="round" />
      <path d="M10 12.5c0-1.5 1.3-2.6 2.5-2.6s2 0.8 2 2" strokeLinecap="round" />
    </svg>
  ),
  content: (
    <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 13l2-1 7.5-7.5a1.5 1.5 0 00-2-2L3 10v3z" strokeLinejoin="round" />
    </svg>
  ),
  issue: (
    <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="2" y="3" width="12" height="10" rx="1" />
      <path d="M2 6h12" />
      <circle cx="5" cy="9.5" r="0.8" fill="currentColor" />
      <circle cx="8" cy="9.5" r="0.8" fill="currentColor" />
      <circle cx="11" cy="9.5" r="0.8" fill="currentColor" />
    </svg>
  ),
} as const;

const TABS: Tab[] = [
  { key: "dashboard", label: "대시보드", icon: ICONS.dashboard },
  { key: "issue", label: "이번 호 표지", icon: ICONS.issue },
  { key: "listings", label: "지원 공고", icon: ICONS.listings },
  { key: "auditions", label: "오디션", icon: ICONS.auditions },
  { key: "fan", label: "응원 메시지", icon: ICONS.fan },
  { key: "members", label: "멤버 관리", icon: ICONS.members },
  { key: "content", label: "사이트 콘텐츠", icon: ICONS.content },
];

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

  async function logout() {
    setBusy(true);
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="admin-shell font-pretendard min-h-screen bg-zinc-50 text-zinc-900">
      {/* Sidebar uses `position: fixed` on desktop — `sticky` breaks under
          `body { overflow-x: hidden }` in globals.css, so we anchor to the
          viewport instead. Main column gets `lg:ml-64` to make room. */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-zinc-900/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`${
          mobileOpen ? "fixed inset-y-0 left-0 z-50 flex" : "hidden lg:flex"
        } lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 h-screen w-64 bg-zinc-950 text-zinc-100 flex-col`}
      >
        <div className="px-5 py-5 border-b border-zinc-800/60 flex items-center gap-3 flex-shrink-0">
          <span className="inline-flex w-9 h-9 rounded-full bg-purple-600 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/cheeze-logo.png"
              alt="CheezeFilm"
              className="w-full h-full object-cover"
            />
          </span>
          <div>
            <div className="text-sm font-bold">치즈필름 관리자</div>
            <div className="text-[10px] uppercase tracking-widest text-zinc-500">
              Studio Admin
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {TABS.map((t) => {
            const isActive = t.key === active;
            const href = t.key === "dashboard" ? "/admin" : `/admin?tab=${t.key}`;
            const badge =
              t.key === "auditions" ? badges?.auditions :
              t.key === "fan" ? badges?.fan : undefined;
            return (
              <Link
                key={t.key}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-[13px] font-semibold transition-colors ${
                  isActive
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                }`}
              >
                <span className="flex items-center gap-3">
                  <span className={isActive ? "text-purple-400" : "text-zinc-500"}>
                    {t.icon}
                  </span>
                  {t.label}
                </span>
                {typeof badge === "number" && badge > 0 && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? "bg-purple-500 text-white"
                        : "bg-purple-500/20 text-purple-300"
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-zinc-800/60">
          <Link
            href="/"
            className="block px-3 py-2 text-[13px] font-medium text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 rounded-lg"
          >
            메인 사이트 열기 ↗
          </Link>
          <div className="mt-3 px-3 flex items-center justify-between gap-2">
            <div className="text-xs text-zinc-500 truncate">
              <div className="text-zinc-300 font-semibold">{username}</div>
              <div className="text-[10px] uppercase tracking-widest">
                Administrator
              </div>
            </div>
            <button
              onClick={logout}
              disabled={busy}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-md border border-zinc-700 hover:bg-zinc-900 disabled:opacity-60"
            >
              {busy ? "..." : "로그아웃"}
            </button>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="min-w-0 flex flex-col lg:ml-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur">
          <div className="px-5 py-3 flex items-center justify-between gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded hover:bg-zinc-100"
              aria-label="메뉴"
            >
              <span className="block w-5 h-[2px] bg-zinc-900 mb-1" />
              <span className="block w-5 h-[2px] bg-zinc-900 mb-1" />
              <span className="block w-5 h-[2px] bg-zinc-900" />
            </button>
            <div className="font-semibold">
              {TABS.find((t) => t.key === active)?.label}
            </div>
            <div className="text-xs text-zinc-500 tabular-nums">
              {new Date().toLocaleString("ko-KR")}
            </div>
          </div>
        </header>

        <main className="flex-1 p-5 sm:p-7 lg:p-9 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
