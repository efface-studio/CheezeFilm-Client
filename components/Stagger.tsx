"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Wraps a string and renders each animated unit as a span with an
 * incremental `--li` CSS variable so the parent's CSS rule can stagger
 * their entry.
 *
 *   mode="word"      (default) → one span per word, whitespace pass-through
 *   mode="character" → one span per Unicode grapheme. Use with the
 *                      `.v2-typewriter` parent class for the input/typing
 *                      look. `Array.from()` correctly handles Korean
 *                      syllables (each precomposed Hangul block = one item).
 */
export function StaggerText({
  text,
  mode = "word",
  startIndex = 0,
}: {
  text: string;
  mode?: "word" | "character";
  /** Offset added to every span's `--li`. Use this when stitching two
   *  StaggerTexts together so the second one continues from the end
   *  of the first instead of restarting at 0. */
  startIndex?: number;
}) {
  if (mode === "character") {
    // Render each character as its own span. Spaces become non-breaking
    // so they keep their width even while invisible (avoids text-reflow
    // as later chars finish their staggered fade-in).
    const chars = Array.from(text);
    let idx = 0;
    return (
      <>
        {chars.map((ch, i) => {
          if (ch === " ") {
            return <span key={i}>&nbsp;</span>;
          }
          const li = startIndex + idx++;
          return (
            <span
              key={i}
              style={{ ["--li" as string]: li } as React.CSSProperties}
            >
              {ch}
            </span>
          );
        })}
      </>
    );
  }

  // Word mode — split by whitespace but keep visual whitespace as
  // separate non-animated text.
  const parts = text.split(/(\s+)/);
  let idx = 0;
  return (
    <>
      {parts.map((p, i) => {
        if (/^\s+$/.test(p)) {
          return <span key={i}>{p}</span>;
        }
        const li = startIndex + idx++;
        return (
          <span
            key={i}
            style={{ ["--li" as string]: li } as React.CSSProperties}
          >
            {p}
          </span>
        );
      })}
    </>
  );
}


/**
 * Generic in-view trigger — sets `data-revealed="true"` once and only once.
 * Same idea as our v1 <Reveal>, but lighter (no className side-effects)
 * and exposed as a hook-friendly wrapper for arbitrary tags.
 */
export function InView({
  as: Tag = "div",
  className,
  rootMargin = "0px 0px -10% 0px",
  threshold = 0.05,
  children,
  ...rest
}: {
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
  rootMargin?: string;
  threshold?: number;
  children?: React.ReactNode;
} & Record<string, unknown>) {
  const ref = useRef<HTMLElement | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setRevealed(true);
      return;
    }
    // Above-fold elements need to reveal immediately — IntersectionObserver
    // queues its first callback for the next frame, and depending on browser
    // it sometimes never fires for elements that are already visible at the
    // very moment of observe() (Chrome dev double-effect in StrictMode is the
    // usual culprit). Synchronous geometry check on mount catches those.
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || 0;
    if (rect.top < vh && rect.bottom > 0) {
      setRevealed(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setRevealed(true);
            io.disconnect();
            return;
          }
        }
      },
      { rootMargin, threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin, threshold]);

  const Component = Tag as React.ElementType;
  return (
    <Component
      ref={ref as React.Ref<HTMLElement>}
      className={className}
      // Explicitly render the string "true" — `data-revealed={true}` would
      // be serialized by React as an empty attribute (`data-revealed=""`),
      // which doesn't satisfy the CSS selectors that look for ="true".
      data-revealed={revealed ? "true" : undefined}
      {...rest}
    >
      {children}
    </Component>
  );
}
