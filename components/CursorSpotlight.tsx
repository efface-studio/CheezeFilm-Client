"use client";

import { useEffect, useRef } from "react";

/**
 * Soft yellow radial glow that follows the cursor — like a stage spotlight
 * on a paper poster. Pure CSS-variable updates so it's cheap on every move.
 * Disabled for touch / reduced-motion users.
 */
export default function CursorSpotlight() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (
      window.matchMedia("(pointer: coarse)").matches ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;

    const onMove = (e: MouseEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!raf) {
        raf = requestAnimationFrame(() => {
          el.style.setProperty("--mx", `${x}px`);
          el.style.setProperty("--my", `${y}px`);
          raf = 0;
        });
      }
    };

    el.style.opacity = "1";
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[5] opacity-0 transition-opacity duration-700"
      style={{
        background:
          "radial-gradient(360px circle at var(--mx, 50%) var(--my, 50%), rgba(250,190,75,0.16), transparent 60%)",
        mixBlendMode: "multiply",
      }}
    />
  );
}
