"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "cheeze_seen_intro";
// Shorter than a real cinema leader — sites can't justify a 3-second blocking
// intro. 500ms per number + 300ms flash → ~1.8s total.
const FRAME_MS = 500;

/**
 * Classic film leader countdown — 3 → 2 → 1 → flash, then fade out.
 * Shown once per session on the home page. Click anywhere to skip.
 */
export default function CountdownLeader() {
  const [phase, setPhase] = useState<
    "hidden" | "three" | "two" | "one" | "flash" | "done"
  >("hidden");

  useEffect(() => {
    // Respect reduced-motion + skip if already shown this session
    if (
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      sessionStorage.getItem(STORAGE_KEY)
    ) {
      return;
    }
    sessionStorage.setItem(STORAGE_KEY, "1");
    setPhase("three");

    const timers = [
      setTimeout(() => setPhase("two"), FRAME_MS),
      setTimeout(() => setPhase("one"), FRAME_MS * 2),
      setTimeout(() => setPhase("flash"), FRAME_MS * 3),
      setTimeout(() => setPhase("done"), FRAME_MS * 3 + 300),
    ];
    return () => {
      for (const t of timers) clearTimeout(t);
    };
  }, []);

  if (phase === "hidden" || phase === "done") return null;

  const num = phase === "three" ? "3" : phase === "two" ? "2" : phase === "one" ? "1" : null;

  return (
    <div
      onClick={() => setPhase("done")}
      role="button"
      aria-label="인트로 건너뛰기"
      tabIndex={-1}
      className={`fixed inset-0 z-[100] grid place-items-center cursor-pointer select-none transition-opacity duration-300 ${
        phase === "flash" ? "bg-cheeze-cream" : "bg-cheeze-charcoal"
      }`}
      style={{
        animation:
          phase === "flash"
            ? "leader-flash 380ms ease-out forwards"
            : undefined,
      }}
    >
      {/* Film grain overlay */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.18]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.6' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
          animation: "grain-shift 200ms steps(4) infinite",
        }}
      />

      {/* Concentric rings — classic SMPTE leader */}
      {num && (
        <div className="relative" key={num}>
          <svg
            width="280"
            height="280"
            viewBox="0 0 280 280"
            className="absolute inset-0 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2"
            style={{ animation: "leader-sweep 700ms linear" }}
          >
            <circle
              cx="140"
              cy="140"
              r="130"
              fill="none"
              stroke="var(--cheeze-yellow)"
              strokeWidth="3"
              opacity="0.7"
            />
            <circle
              cx="140"
              cy="140"
              r="100"
              fill="none"
              stroke="var(--cheeze-yellow)"
              strokeWidth="2"
              opacity="0.45"
            />
            <line x1="140" y1="0" x2="140" y2="280" stroke="var(--cheeze-yellow)" strokeWidth="2" opacity="0.4" />
            <line x1="0" y1="140" x2="280" y2="140" stroke="var(--cheeze-yellow)" strokeWidth="2" opacity="0.4" />
            {/* Rotating sweep arm */}
            <line
              x1="140"
              y1="140"
              x2="140"
              y2="20"
              stroke="var(--cheeze-yellow)"
              strokeWidth="3"
              style={{ transformOrigin: "140px 140px", animation: "leader-arm 700ms linear" }}
            />
          </svg>
          <div
            className="relative grid place-items-center w-[280px] h-[280px] text-cheeze-yellow"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "11rem",
              lineHeight: 1,
              animation: "leader-num 700ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
              textShadow: "0 0 30px rgba(250,190,75,0.4)",
            }}
          >
            {num}
          </div>
          <div
            className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-cheeze-cream/60 text-xs uppercase tracking-[0.4em]"
            style={{ fontFamily: "monospace" }}
          >
            CHEEZE FILM · {num}
          </div>
        </div>
      )}

      <div className="absolute top-4 right-5 text-[10px] uppercase tracking-[0.3em] text-cheeze-cream/40">
        클릭해서 건너뛰기
      </div>

      <style jsx>{`
        @keyframes leader-num {
          0%   { transform: scale(0.6); opacity: 0; }
          40%  { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes leader-arm {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes leader-sweep {
          0%   { opacity: 0; transform: scale(0.85); }
          30%  { opacity: 1; transform: scale(1); }
          100% { opacity: 1; }
        }
        @keyframes leader-flash {
          0%   { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes grain-shift {
          0%   { transform: translate(0,0); }
          25%  { transform: translate(-5px, 3px); }
          50%  { transform: translate(4px, -2px); }
          75%  { transform: translate(-2px, -4px); }
          100% { transform: translate(0,0); }
        }
      `}</style>
    </div>
  );
}
