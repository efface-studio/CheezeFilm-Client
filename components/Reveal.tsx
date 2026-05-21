"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  children: React.ReactNode;
  /** Tailwind / className passthrough applied to the wrapper. */
  className?: string;
  /** Stagger this child by this many ms after entering the viewport. */
  delay?: number;
  /** rootMargin tweak — defaults to "0px 0px -10% 0px" so it fires slightly
   *  before the element fully enters view. */
  rootMargin?: string;
  /** Render as another tag (e.g. "section", "h2"). Defaults to div. */
  as?: keyof React.JSX.IntrinsicElements;
};

/**
 * Tiny scroll-reveal wrapper. Adds `data-revealed="true"` once the element
 * intersects the viewport. Pair with a class that targets that attribute
 * (`.reveal`, `.slate-click`, `.count-pop` …) in globals.css.
 *
 * Why not a heavy library: this is one IntersectionObserver shared per
 * element, no animation framework, no JS keyframes. Stays cheap.
 */
export default function Reveal({
  children,
  className = "reveal",
  delay = 0,
  rootMargin = "0px 0px -10% 0px",
  as = "div",
}: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setRevealed(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            // Stagger by delay, then stop watching.
            const t = setTimeout(() => setRevealed(true), delay);
            io.disconnect();
            return () => clearTimeout(t);
          }
        }
      },
      { rootMargin, threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay, rootMargin]);

  const Tag = as as React.ElementType;
  return (
    <Tag
      ref={ref as React.Ref<HTMLElement>}
      data-revealed={revealed || undefined}
      className={className}
    >
      {children}
    </Tag>
  );
}
