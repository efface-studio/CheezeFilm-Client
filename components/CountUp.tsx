"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  /** Target numeric value. */
  value: number;
  /** Optional decimal places (default 0). */
  decimals?: number;
  /** Suffix appended after the number, e.g. "M+", "억". */
  suffix?: string;
  /** Optional prefix. */
  prefix?: string;
  /** Animation duration in ms. */
  duration?: number;
  /** Override the formatted display when not animating (e.g. "3.32M+"). */
  fallback?: string;
};

// easeOutCubic for a smooth decelerating count — feels like an odometer
// finishing its spin rather than ramping linearly.
function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export default function CountUp({
  value,
  decimals = 0,
  suffix = "",
  prefix = "",
  duration = 1400,
  fallback,
}: Props) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [current, setCurrent] = useState(0);
  const [started, setStarted] = useState(false);

  // Trigger once the element enters viewport
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setStarted(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setStarted(true);
            io.disconnect();
            return;
          }
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Animate from 0 → value when started
  useEffect(() => {
    if (!started) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      setCurrent(value * easeOutCubic(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, value, duration]);

  const display = started
    ? `${prefix}${current.toFixed(decimals)}${suffix}`
    : (fallback ?? `${prefix}0${suffix}`);

  return (
    <span ref={ref} className="tabular-nums">
      {display}
    </span>
  );
}
