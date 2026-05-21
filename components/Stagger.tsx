"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Wraps a string and renders each word as a span with an incremental
 * `--li` CSS variable so the `.v2-stagger` rule can stagger their entry.
 * Pair with the `<Reveal className="v2-stagger">` wrapper.
 */
export function StaggerText({ text }: { text: string }) {
  // Split by whitespace but keep visual whitespace as separate non-animated text.
  const parts = text.split(/(\s+)/);
  let idx = 0;
  return (
    <>
      {parts.map((p, i) => {
        if (/^\s+$/.test(p)) {
          return <span key={i}>{p}</span>;
        }
        const li = idx++;
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
      data-revealed={revealed || undefined}
      {...rest}
    >
      {children}
    </Component>
  );
}
