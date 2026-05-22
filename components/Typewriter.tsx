"use client";

import { useEffect, useState } from "react";

type Props = {
  /** Lines to type out, in order. Each line is typed character-by-character. */
  lines: { text: string; className?: string }[];
  /** Milliseconds between characters. */
  charDelay?: number;
  /** Pause between lines. */
  linePause?: number;
  /** When true, skip typing and show the final state immediately. */
  instant?: boolean;
  /** Hide the cursor this many ms after typing completes. Default 600ms. */
  cursorHideDelay?: number;
};

/**
 * Types out one or more lines of text. Behaves like a teletype:
 *   - cursor stays at the end while typing
 *   - cursor stays visible (blinking) for a beat after the last character
 *   - jumps to instant render under prefers-reduced-motion
 */
export default function Typewriter({
  lines,
  charDelay = 65,
  linePause = 220,
  instant,
  cursorHideDelay = 600,
}: Props) {
  const [shownPerLine, setShownPerLine] = useState<number[]>(
    () => lines.map(() => 0),
  );
  const [done, setDone] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    if (
      instant ||
      (typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    ) {
      setShownPerLine(lines.map((l) => l.text.length));
      setDone(true);
      setCursorVisible(false);
      return;
    }

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let elapsed = 0;

    lines.forEach((line, lineIdx) => {
      for (let i = 1; i <= line.text.length; i++) {
        elapsed += charDelay;
        timers.push(
          setTimeout(() => {
            if (cancelled) return;
            setShownPerLine((prev) => {
              const next = [...prev];
              next[lineIdx] = i;
              return next;
            });
          }, elapsed),
        );
      }
      elapsed += linePause;
    });
    timers.push(setTimeout(() => !cancelled && setDone(true), elapsed));
    // Hide cursor a moment after typing finishes — keeps the typewriter feel
    // without leaving a stray blinking block on the final layout.
    timers.push(
      setTimeout(() => !cancelled && setCursorVisible(false), elapsed + cursorHideDelay),
    );

    return () => {
      cancelled = true;
      for (const t of timers) clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {lines.map((line, idx) => {
        const shown = shownPerLine[idx] ?? 0;
        const isCurrent = !done && shown < line.text.length && shown > 0;
        const isLastLine = idx === lines.length - 1;
        // Cursor stays only on the line currently typing, or on the final
        // line for the brief "settle" window before fading out.
        const showCursorHere =
          (isCurrent && shown > 0) ||
          (done && isLastLine && cursorVisible && shown > 0);
        return (
          <span key={idx} className={line.className ?? ""}>
            {line.text.slice(0, shown)}
            {showCursorHere && (
              <span className="tw-cursor" aria-hidden>
                ▌
              </span>
            )}
            {idx < lines.length - 1 && <br />}
          </span>
        );
      })}
      <style jsx>{`
        :global(.tw-cursor) {
          display: inline-block;
          margin-left: -0.05em;
          color: var(--cheeze-purple);
          animation: tw-blink 0.7s steps(2, start) infinite;
          transition: opacity 200ms ease;
        }
        @keyframes tw-blink {
          50% { opacity: 0; }
        }
      `}</style>
    </>
  );
}
