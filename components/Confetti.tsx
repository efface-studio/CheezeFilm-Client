"use client";

import { useEffect, useState } from "react";

type Particle = {
  id: number;
  x: number; // % from left
  y: number; // % from top
  dx: number; // px translate target
  dy: number;
  rot: number;
  delay: number;
  char: string;
};

const CHEEZE_CHARS = ["🧀", "★", "●", "🎬"];

/**
 * Burst of cheese-themed particles. Render in the parent when a form succeeds;
 * particles unmount automatically after ~1.4s.
 *
 * Pure CSS animation — no canvas, no library.
 */
export default function Confetti({ count = 18 }: { count?: number }) {
  const [particles, setParticles] = useState<Particle[] | null>(null);

  useEffect(() => {
    // Respect reduced-motion
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const arr: Particle[] = Array.from({ length: count }).map((_, i) => {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const dist = 110 + Math.random() * 60;
      return {
        id: i,
        x: 50,
        y: 50,
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist - 40, // bias upward slightly
        rot: (Math.random() - 0.5) * 720,
        delay: Math.random() * 80,
        char: CHEEZE_CHARS[i % CHEEZE_CHARS.length],
      };
    });
    setParticles(arr);
    const t = setTimeout(() => setParticles(null), 1500);
    return () => clearTimeout(t);
  }, [count]);

  if (!particles) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible z-30">
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute text-2xl select-none"
          style={
            {
              left: `${p.x}%`,
              top: `${p.y}%`,
              animation: `cheeze-burst 1300ms cubic-bezier(0.2,0.7,0.2,1) ${p.delay}ms both`,
              "--dx": `${p.dx}px`,
              "--dy": `${p.dy}px`,
              "--rot": `${p.rot}deg`,
            } as React.CSSProperties
          }
        >
          {p.char}
        </span>
      ))}
      <style jsx>{`
        @keyframes cheeze-burst {
          0% {
            transform: translate(-50%, -50%) scale(0.4) rotate(0);
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          100% {
            transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy)))
              scale(1.05) rotate(var(--rot));
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
