/**
 * V2 route-group loading state.
 *
 * Shown automatically by Next.js between the click of a rail link and the
 * new page's first paint. In dev that gap can be 5–15s on a cold route, so
 * we render a minimal cream-colored skeleton with a pulsing accent line —
 * enough to confirm "click registered, page is loading" without trying to
 * mimic the destination layout (which would just look broken when it
 * resolves to something different).
 */
export default function V2Loading() {
  return (
    <main className="min-h-screen bg-cheeze-cream text-cheeze-ink editorial flex flex-col relative">
      {/* Top progress bar — slow horizontal sweep, very visible */}
      <div
        aria-hidden
        className="fixed top-0 inset-x-0 z-50 h-[2px] bg-cheeze-purple-deep/10 overflow-hidden lg:left-56"
      >
        <span className="block h-full w-1/3 bg-cheeze-yellow v2-loading-bar" />
      </div>

      {/* Centered status */}
      <div className="min-h-[60vh] grid place-items-center">
        <div className="flex flex-col items-center gap-3 text-cheeze-olive">
          <span className="flex items-center gap-1.5">
            <span className="v2-pulse-dot" />
            <span className="text-[10px] tracking-[0.4em] uppercase">
              Loading
            </span>
          </span>
          <div
            className="text-3xl text-cheeze-purple-deep/40"
            style={{ fontFamily: "var(--font-display)" }}
          >
            굽는 중…
          </div>
        </div>
      </div>

      <style>{`
        @keyframes v2-loading-bar {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        .v2-loading-bar {
          animation: v2-loading-bar 1.4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}</style>
    </main>
  );
}
