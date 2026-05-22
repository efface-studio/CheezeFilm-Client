"use client";

import { useRef } from "react";

type Props = {
  children: React.ReactNode;
  /** Maximum tilt in degrees on each axis. Keep small or it gets goofy. */
  max?: number;
  className?: string;
  /** Render as another tag. Defaults to div. */
  as?: keyof React.JSX.IntrinsicElements;
};

/**
 * Wrap a card with cursor-tracked 3D perspective tilt. Cheap (one RAF
 * coalesced per frame, CSS-variable updates only). Falls back to nothing on
 * touch devices.
 */
export default function TiltCard({ children, max = 7, className = "", as = "div" }: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const raf = useRef(0);

  function onMouseMove(e: React.MouseEvent<HTMLElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rx = (0.5 - py) * 2 * max;
    const ry = (px - 0.5) * 2 * max;
    if (!raf.current) {
      raf.current = requestAnimationFrame(() => {
        el.style.setProperty("--tilt-rx", `${rx.toFixed(2)}deg`);
        el.style.setProperty("--tilt-ry", `${ry.toFixed(2)}deg`);
        el.style.setProperty("--tilt-tz", `12px`);
        raf.current = 0;
      });
    }
  }

  function onMouseLeave() {
    const el = ref.current;
    if (!el) return;
    if (raf.current) {
      cancelAnimationFrame(raf.current);
      raf.current = 0;
    }
    el.style.setProperty("--tilt-rx", "0deg");
    el.style.setProperty("--tilt-ry", "0deg");
    el.style.setProperty("--tilt-tz", "0px");
  }

  const Tag = as as React.ElementType;
  return (
    <Tag
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className={`tilt-card ${className}`}
    >
      {children}
    </Tag>
  );
}
