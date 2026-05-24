/**
 * Route-group loading state.
 *
 * Shown automatically by Next.js between the click of a rail link and
 * the new page's first paint. In dev that gap can be 5–15s on a cold
 * route, so we render a minimal full-viewport overlay — enough to
 * confirm "click registered, page is loading" without mimicking the
 * destination layout.
 *
 * The Toss redesign swapped the previous translucent display-font
 * text for a centered, brand-coloured composition:
 *   - the cheese-logo chip sits in the middle and gently breathes,
 *   - two yellow halos pulse outward from it on staggered delays,
 *     reading as the studio "굽는 중" (literally "baking"),
 *   - a small status line + helper sit below.
 */
export default function SiteLoading() {
  return (
    <main className="min-h-screen bg-white text-cheeze-ink flex flex-col items-center justify-center px-6">
      {/* Logo + halo. The halos are absolutely-positioned siblings that
          scale-fade outward, staggered 700ms apart so a second pulse
          starts before the first finishes — feels like a heat
          shimmer / dough rising loop rather than a "wait spinner". */}
      <div className="relative w-20 h-20 grid place-items-center">
        <span
          aria-hidden
          className="absolute inset-0 rounded-3xl bg-cheeze-yellow/40 loading-halo"
        />
        <span
          aria-hidden
          className="absolute inset-0 rounded-3xl bg-cheeze-yellow/40 loading-halo"
          style={{ animationDelay: "700ms" }}
        />
        <div className="relative w-16 h-16 rounded-3xl bg-cheeze-purple overflow-hidden shadow-lg shadow-cheeze-purple/20 loading-breathe">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/cheeze-logo.png"
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      <div className="mt-10 text-center">
        {/* Three orbiting dots. Each dot bounces with a staggered
            animation-delay so the row reads as "loading…" without us
            actually rendering an ellipsis. */}
        <div
          aria-hidden
          className="inline-flex items-center gap-1.5 mb-4"
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="block w-1.5 h-1.5 rounded-full bg-cheeze-purple/50 loading-dot"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
        <h2 className="text-[20px] font-bold tracking-tight text-cheeze-ink">
          굽는 중
        </h2>
        <p className="mt-1.5 text-[14px] text-cheeze-ink-soft">
          잠시만 기다려주세요
        </p>
      </div>

      <style>{`
        @keyframes loading-halo {
          0%   { transform: scale(0.92); opacity: 0; }
          25%  { opacity: 0.55; }
          100% { transform: scale(1.9);  opacity: 0; }
        }
        .loading-halo {
          animation: loading-halo 1800ms cubic-bezier(0.22, 0.8, 0.4, 1) infinite;
        }

        @keyframes loading-breathe {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.03); }
        }
        .loading-breathe {
          animation: loading-breathe 1800ms cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes loading-dot {
          0%, 80%, 100% { transform: translateY(0);    opacity: 0.4; }
          40%           { transform: translateY(-4px); opacity: 1;   }
        }
        .loading-dot {
          animation: loading-dot 1100ms ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .loading-halo,
          .loading-breathe,
          .loading-dot {
            animation: none !important;
          }
        }
      `}</style>
    </main>
  );
}
