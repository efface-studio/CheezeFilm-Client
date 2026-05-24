"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { InView } from "@/components/Stagger";

/**
 * hero cover — horizontal slide carousel.
 *
 * Two modes (mutually exclusive):
 *   - `photoSrcs` (preferred): landscape group/cast photos dropped into
 *     `/public/covers/`. The card is non-clickable since these aren't
 *     video pointers.
 *   - `videoIds` (fallback): YouTube video IDs. The card links out to
 *     the *currently visible* video on YouTube.
 *
 * `mode` is auto-detected from whichever array is non-empty. Photos win
 * when both are passed so admins can hide the video fallback by simply
 * dropping a photo.
 *
 * Renders all slides side-by-side in a horizontal flex row and translates
 * the row by `-idx * 100%`. The wrapper is wrapped in `.mask-reveal` so the
 * curtain-reveal entrance animation still plays on first load.
 */
export default function HeroCover({
  photoSrcs = [],
  videoIds = [],
}: {
  photoSrcs?: string[];
  videoIds?: string[];
}) {
  const mode: "photo" | "video" | null =
    photoSrcs.length > 0 ? "photo" : videoIds.length > 0 ? "video" : null;
  const slides = mode === "photo" ? photoSrcs : videoIds;
  const [idx, setIdx] = useState(0);

  // 4.5s per slide. The horizontal slide animation takes ~1.2s, so each
  // slide gets ~3.3s of settled view before the next one starts moving
  // in. Previously was 3s, but at that pace the slide barely settles
  // before the next transition begins — gave the eye no time to actually
  // *read* the cover. Pause when the tab is hidden so the first slide
  // the user sees on return is the one we're currently on.
  useEffect(() => {
    if (slides.length <= 1) return;
    let t: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (t) return;
      t = setInterval(() => {
        setIdx((i) => (i + 1) % slides.length);
      }, 4500);
    };
    const stop = () => {
      if (t) clearInterval(t);
      t = null;
    };
    const onVis = () => (document.hidden ? stop() : start());
    start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [slides.length]);

  if (!mode) return null;
  const activeSlide = slides[idx];

  // Photo mode renders a plain <div> (non-interactive). Video mode wraps
  // in an <a> that opens the active video on YouTube.
  const Wrapper = (props: { children: React.ReactNode }) =>
    mode === "video" ? (
      <a
        href={`https://www.youtube.com/watch?v=${activeSlide}`}
        target="_blank"
        rel="noreferrer"
        className="group block film"
        aria-label="현재 표지 영상 보기"
      >
        {props.children}
      </a>
    ) : (
      <div className="group block film">{props.children}</div>
    );

  // Slightly wider aspect so the cover reads bigger on the home spread
  // (was 3/2, now 5/3 for photos). Videos stay 16/9 since that matches
  // the YouTube thumbnail.
  const aspectClass = mode === "photo" ? "aspect-[5/3]" : "aspect-[16/9]";

  return (
    <Wrapper>
      <InView className={`mask-reveal ${aspectClass} relative bg-cheeze-charcoal overflow-hidden`}>
        {/* Carousel track — a horizontal row of full-width slides.
            We translate the whole row by -idx * 100% so the active
            slide slides into view from the right (or out to the left
            when we wrap from N-1 → 0).

            1200ms with cubic-bezier(0.22, 1, 0.36, 1) — a slow,
            slightly-decelerating ease so the slide *arrives* gently
            rather than snapping into place. Matches Toss's signature
            "smooth-out" cinematic feel. `will-change: transform` and
            `transform: translate3d` force GPU compositing so the slide
            stays buttery even on lower-end devices. */}
        <div
          className="hero-cover-track absolute inset-0 flex"
          style={{ transform: `translate3d(-${idx * 100}%, 0, 0)` }}
        >
          {slides.map((src, i) => {
            const active = i === idx;
            const url =
              mode === "photo"
                ? src
                : `https://i.ytimg.com/vi/${src}/maxresdefault.jpg`;
            return (
              <div
                key={src}
                className="relative w-full h-full flex-shrink-0"
                aria-hidden={!active}
              >
                <Image
                  src={url}
                  alt={active ? "치즈필름 표지" : ""}
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover"
                  // Only the first slide is eager+priority. The rest
                  // load lazily — they're translated off-screen until
                  // the carousel rotates to them ~4.5s later, plenty
                  // of time for a lazy fetch. Eagerly loading all
                  // slides on mount used to contend with the first
                  // for bandwidth and slowed the LCP.
                  priority={i === 0}
                  loading={i === 0 ? "eager" : "lazy"}
                  fetchPriority={i === 0 ? "high" : "low"}
                />
              </div>
            );
          })}
        </div>

        {/* Dim gradient over the bottom for legibility of the cover label. */}
        <div className="absolute inset-0 bg-gradient-to-t from-cheeze-charcoal/85 via-cheeze-charcoal/0 to-cheeze-charcoal/30 pointer-events-none" />

        {/* Slide indicator dots — top-right, subtle */}
        {slides.length > 1 && (
          <div className="absolute top-4 right-4 flex gap-1.5">
            {slides.map((src, i) => (
              <span
                key={src}
                className={`block h-1 transition-all duration-500 ${
                  i === idx ? "w-6 bg-cheeze-yellow" : "w-3 bg-cheeze-cream/40"
                }`}
                aria-hidden
              />
            ))}
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 p-5">
          <div className="text-[10px] tracking-[0.4em] uppercase text-cheeze-yellow/90 mb-2">
            Now Featured · Cover
          </div>
          <div
            className="text-cheeze-cream text-2xl leading-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            이번 호의 한 컷.
          </div>
        </div>
      </InView>
    </Wrapper>
  );
}
