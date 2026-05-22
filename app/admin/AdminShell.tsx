"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Tab =
  | { key: "dashboard"; label: "대시보드"; icon: string }
  | { key: "listings"; label: "지원 공고"; icon: string }
  | { key: "auditions"; label: "오디션"; icon: string; badge?: number }
  | { key: "fan"; label: "응원 메시지"; icon: string; badge?: number }
  | { key: "members"; label: "멤버 관리"; icon: string }
  | { key: "memberPhotos"; label: "멤버 사진"; icon: string }
  | { key: "content"; label: "사이트 콘텐츠"; icon: string };

const TABS: Tab[] = [
  { key: "dashboard", label: "대시보드", icon: "▦" },
  { key: "listings", label: "지원 공고", icon: "▣" },
  { key: "auditions", label: "오디션", icon: "▤" },
  { key: "fan", label: "응원 메시지", icon: "✉" },
  { key: "members", label: "멤버 관리", icon: "◐" },
  { key: "memberPhotos", label: "멤버 사진", icon: "◉" },
  { key: "content", label: "사이트 콘텐츠", icon: "✎" },
];

export default function AdminShell({
  children,
  active,
  username,
  badges,
}: {
  children: React.ReactNode;
  active: Tab["key"];
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
    <div className="admin-shell font-pretendard min-h-screen bg-zinc-100 text-zinc-900">
      {/* Sidebar uses `position: fixed` on desktop instead of `sticky`.
          `sticky` was being broken by `body { overflow-x: hidden }` in
          globals.css — that turns body into a scroll container which
          shifts sticky's containing-block math. Fixed is bulletproof:
          the sidebar is anchored to the viewport regardless of any
          parent's overflow setting. Main column gets `lg:ml-64` to make
          room. Mobile drawer pattern unchanged. */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-zinc-900/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`${
          mobileOpen ? "fixed inset-y-0 left-0 z-50 flex" : "hidden lg:flex"
        } lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 h-screen w-64 bg-zinc-900 text-zinc-100 flex-col`}
      >
          <div className="px-5 py-5 border-b border-zinc-800 flex items-center gap-3 flex-shrink-0">
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
              <div className="text-[10px] uppercase tracking-widest text-zinc-400">
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
                  className={`flex items-center justify-between gap-2 px-3 py-2 rounded text-sm transition-colors ${
                    isActive
                      ? "bg-purple-600 text-white"
                      : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="opacity-70 w-4 text-center">{t.icon}</span>
                    {t.label}
                  </span>
                  {typeof badge === "number" && badge > 0 && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isActive
                          ? "bg-white/25 text-white"
                          : "bg-purple-500 text-white"
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="px-3 py-4 border-t border-zinc-800">
            <Link
              href="/"
              className="block px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 rounded"
            >
              ↗ 메인 사이트 열기
            </Link>
            <div className="mt-3 px-3 flex items-center justify-between gap-2">
              <div className="text-xs text-zinc-400 truncate">
                <div className="text-zinc-300">{username}</div>
                <div className="text-[10px] uppercase tracking-widest">
                  Administrator
                </div>
              </div>
              <button
                onClick={logout}
                disabled={busy}
                className="text-xs px-2.5 py-1.5 rounded border border-zinc-700 hover:bg-zinc-800 disabled:opacity-60"
              >
                {busy ? "..." : "로그아웃"}
              </button>
            </div>
          </div>
      </aside>

      {/* Main column */}
      <div className="min-w-0 flex flex-col lg:ml-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white">
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
            <div className="text-xs text-zinc-500">
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
