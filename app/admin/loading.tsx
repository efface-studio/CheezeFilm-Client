/**
 * Admin loading shell.
 *
 * Re-rendered by Next.js between tab navigations (`?tab=issue`,
 * `?tab=members`, …) while the new tab's server data is in flight.
 * Matches the new AdminShell layout pixel-for-pixel so the transition
 * feels like an animation rather than a layout shift:
 *   - 232px dark sidebar with logo strip + grouped nav rows
 *   - 56px sticky top bar with breadcrumb + ⌘K placeholder + avatar
 *   - Page body skeleton: header block, 4 KPI tiles, 2 trend tiles,
 *     2 inbox panels
 *
 * The "이번 호 표지" tab in particular fetches the full YouTube
 * catalogue and takes a few seconds on cold builds — without this
 * skeleton the previous tab's content stayed visible and the user
 * thought the click broke.
 */
export default function AdminLoading() {
  return (
    <div className="admin-shell font-pretendard min-h-screen bg-zinc-50">
      {/* ── Sidebar skeleton ─────────────────────── */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 h-screen w-[232px] bg-zinc-950 flex-col">
        <div className="h-14 px-3 flex items-center gap-2.5 border-b border-zinc-800/70">
          <div className="w-7 h-7 rounded-md bg-zinc-800 animate-pulse" />
          <div className="space-y-1.5">
            <div className="h-3 w-20 rounded bg-zinc-800 animate-pulse" />
            <div className="h-2 w-16 rounded bg-zinc-900 animate-pulse" />
          </div>
        </div>
        <div className="flex-1 px-2 py-3 space-y-4">
          {[1, 4, 2].map((count, gi) => (
            <div key={gi}>
              <div className="px-3 pb-1.5">
                <div className="h-2 w-16 rounded bg-zinc-800/60 animate-pulse" />
              </div>
              <div className="space-y-0.5">
                {Array.from({ length: count }).map((_, i) => (
                  <div
                    key={i}
                    className="h-8 mx-0 rounded-md bg-zinc-900 animate-pulse"
                    style={{ animationDelay: `${(gi * 100) + (i * 60)}ms` }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Main column ──────────────────────────── */}
      <div className="min-w-0 flex flex-col lg:ml-[232px]">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-14 border-b border-zinc-200 bg-white">
          <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="h-3.5 w-32 rounded bg-zinc-100 animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden md:block h-9 w-72 rounded-lg bg-zinc-100 animate-pulse" />
              <div className="w-9 h-9 rounded-lg bg-zinc-100 animate-pulse" />
              <div className="w-9 h-9 sm:w-32 rounded-lg bg-zinc-100 animate-pulse" />
            </div>
          </div>
        </header>

        <main className="flex-1 p-5 sm:p-7 lg:p-8 max-w-[1400px] w-full mx-auto">
          {/* PageHeader skeleton */}
          <div className="pb-5 mb-6 border-b border-zinc-200">
            <div className="h-6 w-40 rounded bg-zinc-100 animate-pulse" />
            <div className="mt-2 h-3 w-64 rounded bg-zinc-50 animate-pulse" />
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-[88px] rounded-lg border border-zinc-200 bg-white animate-pulse"
                style={{ animationDelay: `${i * 80}ms` }}
              />
            ))}
          </div>

          {/* Trend strip */}
          <div className="grid sm:grid-cols-2 gap-3 mb-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="h-[88px] rounded-lg border border-zinc-200 bg-white animate-pulse"
                style={{ animationDelay: `${i * 80 + 320}ms` }}
              />
            ))}
          </div>

          {/* Inbox panels */}
          <div className="grid lg:grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="h-72 rounded-lg border border-zinc-200 bg-white animate-pulse"
                style={{ animationDelay: `${i * 100 + 500}ms` }}
              />
            ))}
          </div>

          {/* Soft "불러오는 중" indicator pinned bottom-right so the
              admin knows something is happening even after the
              skeleton is on screen for >1s. */}
          <div className="mt-8 flex items-center gap-2 text-[12px] text-zinc-400">
            <span className="inline-block w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            불러오는 중…
          </div>
        </main>
      </div>
    </div>
  );
}
