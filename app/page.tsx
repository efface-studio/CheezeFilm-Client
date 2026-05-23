// 이 페이지에선 의도적으로 `next/link` 가 아닌 평범한 `<a>` 를 사용합니다.
// 디자인 picker 는 V1 ↔ V2 사이의 완전한 hard switch — SPA prefetch /
// 클라이언트 라우팅이 view-transition 콜백 안에서 router.push 가 silently
// 실패하는 경우가 있어 클릭이 먹지 않았어요. `data-no-vt` 가 PageTransition
// 가로채기를 건너뛰게 해주고, plain anchor 의 기본 동작이 hard navigation
// 을 수행합니다.

export const metadata = {
  title: "치즈필름 | CheezeFilm",
  description:
    "두 가지 무드 중 하나를 골라 들어가세요. 빈티지 시네마, 또는 모던 에디토리얼.",
};

/**
 * Version picker landing. Same brand palette (cheeze purple + yellow + cream),
 * two halves that hint at the design tone you'll get on the other side.
 */
export default function VersionPicker() {
  return (
    <main className="min-h-screen flex flex-col md:flex-row picker-stage relative">
      {/* V1 — Vintage Cinema (warm side) */}
      <a
        href="/v1"
        aria-label="버전 01 — 빈티지 시네마"
        className="picker-half picker-half--vintage group"
        data-no-vt
      >
        <div className="picker-half__inner">
          {/* Decorative vintage hints */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="film-strip absolute left-0 right-0 top-12 h-6" />
            <div className="film-strip absolute left-0 right-0 bottom-12 h-6" />
            <span
              aria-hidden
              className="absolute right-8 top-32 hidden lg:inline-block w-40 h-52 bg-white border-2 border-cheeze-purple-deep -rotate-[6deg] shadow-[8px_8px_0_var(--cheeze-purple-deep)] overflow-hidden"
            >
              <span className="block h-36 bg-cheeze-purple grid place-items-center text-5xl">
                🧀
              </span>
              <span
                className="block text-center mt-1 text-xs"
                style={{ fontFamily: "var(--font-display)" }}
              >
                CHEEZE!
              </span>
            </span>
          </div>

          <div className="picker-content">
            <span className="tape inline-block text-xs">VERSION 01</span>
            <h2
              className="picker-title mt-6"
              style={{ fontFamily: "var(--font-display)" }}
            >
              빈티지
              <br />
              <span className="text-cheeze-purple">시네마.</span>
            </h2>
            <p className="picker-sub mt-5">
              필름 그레인, 폴라로이드, 손맛 가득한 무드.
              <br />
              지금까지 보던 화면 그대로.
            </p>
            <div className="picker-meta">VINTAGE · WARM · PLAYFUL</div>
            <div className="picker-cta picker-cta--filled">
              <span className="inline-block w-2 h-2 rounded-full bg-current" />
              현재 디자인 들어가기 →
            </div>
          </div>
        </div>
      </a>

      {/* V2 — Modern Editorial (sleek side, same colors, different feel) */}
      <a
        href="/v2"
        aria-label="버전 02 — 모던 에디토리얼"
        className="picker-half picker-half--editorial group"
        data-no-vt
      >
        <div className="picker-half__inner">
          {/* Decorative modern hints — sharp geometry */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-12 left-8 right-8 h-px bg-cheeze-purple-deep/30" />
            <div className="absolute bottom-12 left-8 right-8 h-px bg-cheeze-purple-deep/30" />
            <div className="absolute right-12 top-1/3 text-[11px] tracking-[0.4em] text-cheeze-purple/60 uppercase font-mono [writing-mode:vertical-rl] hidden lg:block">
              CHEEZEFILM · 2026 · EDITORIAL
            </div>
            <div
              aria-hidden
              className="absolute right-12 top-32 hidden lg:flex flex-col gap-3 items-end"
            >
              <span className="text-[10px] tracking-[0.3em] text-cheeze-purple-deep uppercase">
                Issue 02 · Spring
              </span>
              <span className="block w-40 h-px bg-cheeze-purple-deep" />
              <span
                className="text-[5rem] leading-none text-cheeze-purple-deep"
                style={{ fontFamily: "var(--font-display)" }}
              >
                02
              </span>
              <span className="block w-40 h-px bg-cheeze-purple-deep" />
              <span className="text-[10px] tracking-[0.3em] text-cheeze-purple-deep uppercase">
                Modern · Editorial
              </span>
            </div>
          </div>

          <div className="picker-content">
            <div className="text-[10px] tracking-[0.45em] text-cheeze-purple-deep/80 uppercase font-mono">
              VERSION 02
            </div>
            <h2
              className="picker-title mt-6 tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              모던
              <br />
              <span className="text-cheeze-purple">에디토리얼.</span>
            </h2>
            <p className="picker-sub mt-5">
              큰 타이포, 절제된 그리드, 매거진처럼 읽는 무드.
              <br />
              같은 보랏빛, 다른 결.
            </p>
            <div className="picker-meta">MODERN · CLEAN · EDITORIAL</div>
            <div className="picker-cta picker-cta--outline">
              <span className="inline-block w-2 h-2 rounded-full bg-current" />
              새 디자인 들어가기 →
            </div>
          </div>
        </div>
      </a>

      {/* Centered logo + identity strip */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-center pt-5 sm:pt-6">
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-cheeze-purple-deep text-cheeze-yellow border-2 border-cheeze-yellow/30 shadow-[3px_3px_0_var(--cheeze-purple-deep)]">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/cheeze-logo.png"
              alt="CheezeFilm"
              className="w-full h-full object-cover"
            />
          </span>
          <span className="text-xs sm:text-sm font-bold tracking-[0.25em]">
            CHEEZE FILM
          </span>
        </div>
      </div>

      {/* Footer microcopy */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center text-[10px] text-cheeze-purple-deep/70 tracking-widest uppercase">
        Pick your design · 클릭해서 들어가세요
      </div>

      <style>{`
        .picker-stage {
          background: var(--cheeze-cream);
          overflow: hidden;
        }
        .picker-half {
          position: relative;
          flex: 1 1 50%;
          min-height: 50vh;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          transition: flex-grow 600ms cubic-bezier(0.2, 0.7, 0.2, 1),
                      filter 400ms ease;
          isolation: isolate;
        }
        .picker-half__inner {
          position: relative; width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
        }
        @media (min-width: 768px) {
          .picker-half { min-height: 100vh; }
          .picker-stage:hover .picker-half { flex-grow: 0.82; filter: brightness(0.92); }
          .picker-stage .picker-half:hover { flex-grow: 1.45; filter: brightness(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .picker-stage:hover .picker-half,
          .picker-stage .picker-half:hover { flex-grow: 1; filter: none; }
        }

        /* V1 side — warm cream paper with subtle yellow wash */
        .picker-half--vintage {
          background:
            radial-gradient(700px 400px at 30% 30%, rgba(244,194,53,0.28), transparent 60%),
            radial-gradient(500px 400px at 25% 80%, rgba(177,58,44,0.15), transparent 60%),
            var(--cheeze-cream);
          color: var(--cheeze-ink);
        }
        /* V2 side — cleaner cream-deep with purple tint, no texture */
        .picker-half--editorial {
          background:
            linear-gradient(180deg, var(--cheeze-cream-deep) 0%, var(--cheeze-cream) 100%);
          color: var(--cheeze-ink);
          border-left: 1px solid rgba(85,34,163,0.15);
        }
        @media (max-width: 767px) {
          .picker-half--editorial {
            border-left: none;
            border-top: 1px solid rgba(85,34,163,0.15);
          }
        }

        .picker-content {
          position: relative; z-index: 2;
          padding: 4rem 1.5rem; text-align: left;
          max-width: 28rem;
        }
        .picker-half--editorial .picker-content { text-align: left; }
        .picker-title {
          font-size: clamp(3rem, 8vw, 5.5rem);
          line-height: 0.95;
        }
        .picker-half--editorial .picker-title {
          font-size: clamp(2.8rem, 7vw, 5rem);
          letter-spacing: -0.02em;
        }
        .picker-sub {
          font-size: 1rem;
          opacity: 0.78;
          line-height: 1.65;
        }
        .picker-meta {
          margin-top: 2rem;
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          font-size: 0.65rem;
          letter-spacing: 0.35em;
          color: var(--cheeze-olive);
          font-family: monospace;
        }
        .picker-meta::before, .picker-meta::after {
          content: "";
          width: 28px; height: 1px;
          background: currentColor; opacity: 0.4;
        }
        .picker-cta {
          margin-top: 2.5rem;
          display: inline-flex;
          align-items: center;
          gap: 0.7rem;
          font-size: 0.85rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          padding: 0.85rem 1.6rem;
          transition: transform 180ms, box-shadow 180ms, background 180ms, color 180ms;
        }
        .picker-cta--filled {
          background: var(--cheeze-purple);
          color: var(--cheeze-yellow);
          border: 2px solid var(--cheeze-purple-deep);
          box-shadow: 4px 4px 0 var(--cheeze-purple-deep);
        }
        .picker-half--vintage:hover .picker-cta--filled {
          transform: translate(-2px, -2px);
          box-shadow: 6px 6px 0 var(--cheeze-purple-deep);
        }
        .picker-cta--outline {
          background: transparent;
          color: var(--cheeze-purple-deep);
          border: 1px solid var(--cheeze-purple-deep);
        }
        .picker-half--editorial:hover .picker-cta--outline {
          background: var(--cheeze-purple-deep);
          color: var(--cheeze-yellow);
        }
      `}</style>
    </main>
  );
}
