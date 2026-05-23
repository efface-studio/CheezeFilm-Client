"use client";

import { useRef, useState } from "react";

/**
 * Careers-page reel player.
 *
 * Browsers enforce a hard rule: `autoplay` only works when the video is
 * `muted` until the user interacts with the page. There's no flag we can
 * set to opt out — it's a Chrome/Safari/Firefox security default. So we
 *   1. ship the video muted so it actually autoplays on page entry, and
 *   2. show a tappable "소리 켜기" chip top-right; one click unmutes and
 *      the toggle becomes "소리 끄기".
 *
 * Once the user has interacted, switching `muted` is allowed for the rest
 * of the session — no further prompts.
 */
export default function CareersReel({
  src,
  label,
}: {
  src: string;
  label: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  function toggleMute() {
    const v = ref.current;
    if (!v) return;
    const next = !v.muted;
    v.muted = next;
    setMuted(next);
    // If the user just unmuted and the browser stopped playback for any
    // reason (tab backgrounded, etc.), nudge it back. `.play()` returns a
    // promise that rejects if the browser refuses — we swallow that.
    if (!next) v.play().catch(() => {});
  }

  return (
    <div className="relative aspect-[9/16] max-w-[360px] mx-auto bg-cheeze-charcoal overflow-hidden">
      <video
        ref={ref}
        src={src}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        controls
        preload="metadata"
        aria-label={label}
      />
      {/* Mute toggle — minimal circular icon button, inline SVG so the
          glyph renders identically across OSes (no emoji jank). Sits above
          the native controls row. `stopPropagation` keeps it from also
          toggling play/pause when clicked. */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleMute();
        }}
        className="absolute top-3 right-3 z-10 grid place-items-center w-9 h-9 rounded-full bg-cheeze-charcoal/65 hover:bg-cheeze-charcoal/90 text-cheeze-cream backdrop-blur-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cheeze-yellow/70"
        aria-pressed={!muted}
        aria-label={muted ? "소리 켜기" : "소리 끄기"}
        title={muted ? "소리 켜기" : "소리 끄기"}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          {/* Speaker cone — shared between muted/unmuted states */}
          <path d="M7 5L4 7H2v2h2l3 2V5z" fill="currentColor" stroke="none" />
          {muted ? (
            // Muted: an X cross to the right of the cone
            <>
              <path d="M11 6l3 4M14 6l-3 4" />
            </>
          ) : (
            // Unmuted: two sound waves curving out to the right
            <>
              <path d="M10.5 5.5a3.5 3.5 0 010 5" />
              <path d="M12.5 4a6 6 0 010 8" />
            </>
          )}
        </svg>
      </button>
    </div>
  );
}
