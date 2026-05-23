/**
 * Admin loading shell.
 *
 * The admin page is a server component that re-runs on every tab change
 * (`?tab=issue`, `?tab=members`, …). The "이번 호 표지" tab in particular
 * fetches the full YouTube catalogue + cover photos and takes ~5s on a
 * cold dev build, so without a loading state the previous tab's content
 * stays visible and the user thinks the click broke.
 *
 * Shown automatically by Next.js while the new tab's data is in flight.
 * Renders a minimal pulsing skeleton that matches the admin shell's
 * dark left rail + cream content area.
 */
export default function AdminLoading() {
  return (
    <div className="min-h-screen flex bg-zinc-950 text-zinc-200 font-pretendard admin-shell">
      {/* Sidebar skeleton */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col bg-zinc-950 border-r border-zinc-800/60">
        <div className="px-5 py-5 border-b border-zinc-800/60">
          <div className="h-5 w-32 bg-zinc-800 rounded animate-pulse" />
          <div className="mt-2 h-3 w-20 bg-zinc-900 rounded animate-pulse" />
        </div>
        <div className="flex-1 px-3 py-4 space-y-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="h-10 rounded-lg bg-zinc-900 animate-pulse"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      </aside>

      {/* Content skeleton */}
      <main className="flex-1 bg-zinc-100 text-zinc-900">
        <div className="px-6 md:px-10 py-6 border-b border-zinc-200 bg-white flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-6 w-40 bg-zinc-200 rounded animate-pulse" />
            <div className="h-3 w-64 bg-zinc-100 rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-2 text-[12px] text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            불러오는 중…
          </div>
        </div>
        <div className="p-6 md:p-10 space-y-6">
          <div className="h-32 bg-white border border-zinc-200 rounded-lg animate-pulse" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/2] bg-white border border-zinc-200 rounded-lg animate-pulse"
                style={{ animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
