"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { Video } from "@/lib/youtube";
import { t, type Lang } from "@/lib/i18n";

const PAGE_SIZE = 18;
type Kind = "longform" | "shorts";

function formatDate(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}
function formatDuration(sec: number | undefined) {
  if (typeof sec !== "number") return "";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  if (sec >= 3600) {
    const h = Math.floor(sec / 3600);
    const mm = Math.floor((sec % 3600) / 60);
    return `${h}:${String(mm).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function VideosGrid({
  longform,
  shorts,
  initialKind,
  lang = "ko",
}: {
  longform: Video[];
  shorts: Video[];
  initialKind: Kind;
  lang?: Lang;
}) {
  const [kind, setKind] = useState<Kind>(initialKind);
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [active, setActive] = useState<Video | null>(null);
  const source = kind === "longform" ? longform : shorts;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return source;
    return source.filter(
      (v) =>
        v.title.toLowerCase().includes(q) ||
        (v.description?.toLowerCase().includes(q) ?? false),
    );
  }, [source, query]);

  const shown = filtered.slice(0, visible);
  const hasMore = visible < filtered.length;

  function switchKind(k: Kind) {
    if (k === kind) return;
    setKind(k);
    setQuery("");
    setVisible(PAGE_SIZE);
  }

  return (
    <>
      {/* Filter strip — Toss-style pill segmented control. */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-10 pb-6 border-b border-cheeze-purple-deep/15">
        <div className="inline-flex items-center gap-1 p-1 rounded-full bg-toss-100">
          <button
            type="button"
            onClick={() => switchKind("longform")}
            className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-all ${
              kind === "longform"
                ? "bg-white text-cheeze-ink shadow-sm"
                : "text-cheeze-ink-soft/70 hover:text-cheeze-ink"
            }`}
          >
            {t("videos.tab.longform", lang)} · {longform.length}
          </button>
          <button
            type="button"
            onClick={() => switchKind("shorts")}
            className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-all ${
              kind === "shorts"
                ? "bg-white text-cheeze-ink shadow-sm"
                : "text-cheeze-ink-soft/70 hover:text-cheeze-ink"
            }`}
          >
            {t("videos.tab.shorts", lang)} · {shorts.length}
          </button>
        </div>

        {/* min-w-[240px] forced an overflow on viewports < ~390px when
            the tab pills already filled the row. Drop the min on
            mobile (min-w-0 lets it shrink), restore at sm+ where
            240px is comfortable. */}
        <div className="flex items-center gap-3 flex-1 min-w-0 sm:min-w-[240px] max-w-md">
          <span className="text-cheeze-olive text-xs uppercase tracking-widest hidden sm:inline">
            {t("videos.search.label", lang)}
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setVisible(PAGE_SIZE);
            }}
            placeholder={t("videos.search.placeholder", lang)}
            className="flex-1 bg-transparent border-b border-cheeze-purple-deep/40 focus:border-cheeze-purple-deep outline-none py-2 text-sm placeholder:text-cheeze-olive/60"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-24 text-center text-cheeze-olive">
          {source.length === 0
            ? t("videos.empty.title", lang)
            : (lang === "en" ? `No results for “${query}”.` : `“${query}” 결과가 없어요.`)}
        </div>
      ) : kind === "longform" ? (
        <LongformGrid videos={shown} onOpen={setActive} />
      ) : (
        <ShortsGrid videos={shown} onOpen={setActive} />
      )}

      {hasMore && (
        <div className="mt-14 flex justify-center">
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="text-sm font-bold tracking-widest uppercase px-6 py-3 border border-cheeze-purple-deep text-cheeze-purple-deep hover:bg-cheeze-purple-deep hover:text-cheeze-yellow transition-colors"
          >
            Load more · {filtered.length - visible} more
          </button>
        </div>
      )}

      {active && <PlayerModal video={active} onClose={() => setActive(null)} />}
    </>
  );

  function LongformGrid({ videos, onOpen }: { videos: Video[]; onOpen: (v: Video) => void }) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
        {videos.map((v, i) => (
          <button
            key={v.id}
            type="button"
            onClick={() => onOpen(v)}
            className="group text-left film"
          >
            <div className="aspect-[16/10] relative overflow-hidden bg-cheeze-charcoal">
              <Image
                src={v.thumbnail}
                alt={v.title}
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover"
                // The first 6 cards (lg: 2 rows × 3 cols, sm: 3 rows × 2
                // cols) sit at or just below the fold on most viewports.
                // Eager-loading them takes one round-trip and improves
                // LCP measurably on `/videos` — previously every card
                // was lazy, so the page rendered an empty grid for ~200ms
                // before the YouTube thumbnails streamed in.
                priority={i < 6}
                loading={i < 6 ? "eager" : "lazy"}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-cheeze-charcoal/55 via-cheeze-charcoal/0 to-transparent" />
              {v.durationSec && (
                <span className="absolute bottom-3 right-3 bg-cheeze-charcoal/90 text-cheeze-cream text-[11px] font-mono px-2 py-1 tracking-wider">
                  {formatDuration(v.durationSec)}
                </span>
              )}
              <div className="film__hint">
                <span className="text-[11px] tracking-widest uppercase">▸ Play</span>
              </div>
            </div>
            <h3 className="mt-4 text-lg font-bold leading-snug text-cheeze-ink line-clamp-2 group-hover:text-cheeze-purple transition-colors">
              {v.title}
            </h3>
            <div className="mt-1 text-[11px] tracking-widest uppercase text-cheeze-olive">
              {formatDate(v.publishedAt)}
            </div>
          </button>
        ))}
      </div>
    );
  }

  function ShortsGrid({ videos, onOpen }: { videos: Video[]; onOpen: (v: Video) => void }) {
    return (
      // Width matches the longform grid exactly — same Tailwind class
      // pattern, just `lg:grid-cols-4` instead of `lg:grid-cols-3`
      // because shorts are 9:16 and 4 per row reads fine.
      //
      // CRITICAL: do NOT add `grid-cols-1` as the default. The
      // longform grid above omits the base count and lets the grid
      // implicitly be a single column on mobile. When ShortsGrid had
      // `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` set, the parent
      // section (which has `mx-auto` on a flex-col parent) auto-margins
      // were resolving the section to the grid's min-content width
      // instead of stretching to max-w-[100rem]. Dropping the explicit
      // `grid-cols-1` and using `w-full` forces full-width stretch on
      // both grids and makes the shorts grid align with longform.
      <div className="w-full grid sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12">
        {videos.map((v, i) => (
          <button
            key={v.id}
            type="button"
            onClick={() => onOpen(v)}
            className="group text-left film"
          >
            <div className="aspect-[9/16] relative overflow-hidden rounded-2xl bg-cheeze-charcoal">
              <Image
                src={v.thumbnail}
                alt={v.title}
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover"
                // First row of shorts (lg: 4 cards, sm: 2 cards) loads
                // eagerly so the tab swap from longform → shorts doesn't
                // show empty boxes for a beat.
                priority={i < 4}
                loading={i < 4 ? "eager" : "lazy"}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-cheeze-charcoal/85 to-transparent" />
              <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-white/95 text-cheeze-ink text-[11px] font-bold px-3 py-1.5">
                <span aria-hidden className="block w-1.5 h-1.5 rounded-full bg-red-500" />
                SHORTS
              </span>
              <div className="absolute inset-x-5 bottom-5 text-[17px] font-bold leading-snug text-cheeze-cream line-clamp-2 drop-shadow-md">
                {v.title}
              </div>
            </div>
            <div className="mt-3 px-1 text-[13px] text-cheeze-ink-soft">
              {formatDate(v.publishedAt)}
            </div>
          </button>
        ))}
      </div>
    );
  }
}

const CREDIT_KEYS = ["출연", "주연", "조연", "연출", "감독", "각본", "촬영", "편집", "음악", "스타일링", "기획"];

function parseCredits(description?: string) {
  if (!description) return [];
  const out: { key: string; value: string }[] = [];
  for (const raw of description.split(/\r?\n/)) {
    const m = raw.trim().match(/^([^:\s]{1,8})\s*[::]\s*(.+)$/);
    if (m && CREDIT_KEYS.includes(m[1].trim())) {
      out.push({ key: m[1].trim(), value: m[2].trim() });
    }
  }
  return out;
}

function PlayerModal({ video, onClose }: { video: Video; onClose: () => void }) {
  const credits = parseCredits(video.description);
  const body = video.description
    ?.split(/\r?\n/)
    .filter((line) => {
      const m = line.trim().match(/^([^:\s]{1,8})\s*[::]/);
      return !m || !CREDIT_KEYS.includes(m[1].trim());
    })
    .join("\n")
    .trim();

  return (
    // Keyframes `player-modal-fade` / `player-modal-in` live in
    // globals.css so the modal doesn't ship an inline <style> tag on
    // each open (which caused a one-frame layout recalc on first
    // interaction).
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-cheeze-charcoal/85 backdrop-blur-sm p-4 player-modal-backdrop"
      onClick={onClose}
    >
      <div
        className={`w-full ${video.isShort ? "max-w-md" : "max-w-4xl"} max-h-[92vh] overflow-y-auto bg-cheeze-cream border border-cheeze-purple-deep player-modal-card`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`${video.isShort ? "aspect-[9/16]" : "aspect-video"} relative bg-cheeze-charcoal`}>
          <iframe
            className="absolute inset-0 w-full h-full"
            src={`https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
        <div className="p-6 grid gap-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-2xl tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                {video.title}
              </h3>
              <div className="text-xs text-cheeze-olive mt-1 tracking-widest uppercase">{formatDate(video.publishedAt)}</div>
            </div>
            <div className="flex gap-2">
              <a
                href={video.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-toss-50 text-cheeze-ink text-[13px] font-semibold hover:bg-toss-100 transition-colors"
              >
                YouTube
                <span aria-hidden>↗</span>
              </a>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cheeze-ink text-white text-[13px] font-semibold hover:bg-cheeze-ink-soft transition-colors"
              >
                <span aria-hidden>✕</span>
                닫기
              </button>
            </div>
          </div>

          {credits.length > 0 && (
            <div className="border-t border-cheeze-purple-deep/15 pt-4">
              <div className="text-[10px] tracking-[0.4em] uppercase text-cheeze-purple mb-3">▣ Credits</div>
              <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {credits.map((c, i) => (
                  <div key={i} className="flex gap-3">
                    <dt className="text-cheeze-olive font-bold min-w-[3rem] shrink-0">{c.key}</dt>
                    <dd className="text-cheeze-ink-soft">{c.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {body && (
            <div className="border-t border-cheeze-purple-deep/15 pt-4">
              <div className="text-[10px] tracking-[0.4em] uppercase text-cheeze-purple mb-2">설명</div>
              <p className="text-sm text-cheeze-ink-soft whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                {body}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
