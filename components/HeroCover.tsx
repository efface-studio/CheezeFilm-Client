"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { InView } from "@/components/Stagger";

/**
 * V2 hero cover — slow cross-fade slideshow.
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
 * Stacks all images with `position: absolute` (via `fill`) and toggles
 * opacity. Only the active one is 100%; the rest sit pre-loaded behind
 * with opacity 0 so the cross-fade has nothing to wait on. The active
 * image is wrapped in the same `.v2-mask` curtain-reveal the original
 * static cover used, so the entrance animation still plays on first load.
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

  // 6s per slide. The new crossfade rides for 2.2s and the
  // ken-burns drift covers the rest, so each slide gets ~3.8s of
  // "settled" view plus 2.2s of overlap with the next — slow
  // enough that the eye actually looks at the photo, fast enough
  // that the slideshow doesn't feel stuck.
  // Pause when the tab is hidden so the first slide the user sees
  // is the one we're currently on.
  useEffect(() => {
    if (slides.length <= 1) return;
    let t: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (t) return;
      t = setInterval(() => {
        setIdx((i) => (i + 1) % slides.length);
      }, 6000);
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
        className="group block v2-film"
        aria-label="현재 표지 영상 보기"
      >
        {props.children}
      </a>
    ) : (
      <div className="group block v2-film">{props.children}</div>
    );

  // Photos look right wide (cast line-ups, group shots). Videos use their
  // native 16:9 thumbnail proportion — close enough to feel landscape too.
  const aspectClass = mode === "photo" ? "aspect-[3/2]" : "aspect-[16/9]";

  return (
    <Wrapper>
      <InView className={`v2-mask ${aspectClass} relative bg-cheeze-charcoal`}>
        {slides.map((src, i) => {
          const active = i === idx;
          const url =
            mode === "photo"
              ? src
              : `https://i.ytimg.com/vi/${src}/maxresdefault.jpg`;
          return (
            <Image
              key={src}
              // `.is-active` (added when this slide's index === idx)
              // drives the ken-burns keyframe defined in globals.css.
              // Every flip to active restarts the animation from
              // scale(1) → scale(1.07) over the full hold duration.
              // Opacity uses a slow cubic-bezier fade so two
              // consecutive slides bleed into each other for ~1.6s
              // in the middle.
              src={url}
              alt={active ? "치즈필름 표지" : ""}
              fill
              sizes="(min-width: 1024px) 42vw, 100vw"
              className={`hero-cover-img object-cover ${active ? "is-active" : ""}`}
              priority={i === 0}
              loading="eager"
            />
          );
        })}
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
