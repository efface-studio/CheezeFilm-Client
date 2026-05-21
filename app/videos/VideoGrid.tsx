"use client";

import { useMemo, useState } from "react";
import type { Video } from "@/lib/youtube";

const PAGE_SIZE = 24;
type Kind = "longform" | "shorts";

function formatDate(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
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

export default function VideoGrid({
  longform,
  shorts,
  initialKind,
}: {
  longform: Video[];
  shorts: Video[];
  initialKind: Kind;
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

  if (longform.length === 0 && shorts.length === 0) {
    return (
      <div className="poster p-10 text-center text-cheeze-ink-soft">
        표시할 영상이 없습니다.
      </div>
    );
  }

  function switchKind(next: Kind) {
    if (next === kind) return;
    setKind(next);
    setVisible(PAGE_SIZE);
    setQuery("");
  }

  return (
    <>
      {/* Kind switcher */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="tabbar shadow-[4px_4px_0_var(--cheeze-purple-deep)]">
          <button
            type="button"
            data-active={kind === "longform"}
            onClick={() => switchKind("longform")}
          >
            🎬 롱폼 ({longform.length})
          </button>
          <button
            type="button"
            data-active={kind === "shorts"}
            onClick={() => switchKind("shorts")}
          >
            📱 쇼츠 ({shorts.length})
          </button>
        </div>
        <p className="text-xs text-cheeze-olive max-w-xs leading-relaxed">
          {kind === "longform"
            ? "60초가 넘는 정규 영상·웹드라마"
            : "1분 이하 세로 영상. 모바일에서 가볍게 즐겨보세요."}
        </p>
      </div>

      {/* Search bar */}
      <div className="mb-8 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <label htmlFor="video-q" className="sr-only">
          영상 제목 검색
        </label>
        <input
          id="video-q"
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setVisible(PAGE_SIZE);
          }}
          placeholder={
            kind === "longform"
              ? "제목으로 검색 — 예: 다중인격, 여사친"
              : "쇼츠 검색 — 예: 풀버전"
          }
          className="field-input flex-1"
        />
        <div className="text-sm text-cheeze-olive">
          {filtered.length === source.length
            ? `${source.length}편 전체`
            : `${filtered.length}편 검색됨`}
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="poster p-10 text-center text-cheeze-ink-soft">
          {source.length === 0
            ? kind === "longform"
              ? "표시할 롱폼 영상이 없어요."
              : "표시할 쇼츠가 없어요."
            : `“${query}”와(과) 일치하는 영상이 없어요.`}
        </div>
      ) : kind === "longform" ? (
        <LongformGrid videos={shown} onOpen={setActive} />
      ) : (
        <ShortsGrid videos={shown} onOpen={setActive} />
      )}

      {/* Load more */}
      {hasMore && (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="btn-yellow"
          >
            ▼ 더 보기 ({filtered.length - visible}편 남음)
          </button>
        </div>
      )}

      {/* Modal player */}
      {active && <PlayerModal video={active} onClose={() => setActive(null)} />}
    </>
  );
}

// --- Longform 16:9 grid ---------------------------------------------------

function LongformGrid({
  videos,
  onOpen,
}: {
  videos: Video[];
  onOpen: (v: Video) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {videos.map((v) => (
        <button
          key={v.id}
          type="button"
          onClick={() => onOpen(v)}
          className="poster lightleak noise-overlay text-left group flex flex-col"
        >
          <div className="aspect-video relative overflow-hidden border-b-2 border-cheeze-purple-deep bg-cheeze-charcoal">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={v.thumbnail}
              alt={v.title}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <span className="absolute inset-0 grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity bg-cheeze-purple-deep/55">
              <span className="text-cheeze-yellow text-5xl">▶</span>
            </span>
            {v.durationSec && (
              <span className="absolute bottom-2 right-2 bg-cheeze-charcoal/85 text-cheeze-cream text-[11px] font-mono px-1.5 py-0.5">
                {formatDuration(v.durationSec)}
              </span>
            )}
          </div>
          <div className="p-4 flex flex-col gap-1">
            <h3 className="font-bold text-cheeze-ink line-clamp-2 leading-snug">
              {v.title}
            </h3>
            <div className="text-xs text-cheeze-olive">
              {formatDate(v.publishedAt)}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

// --- Shorts 9:16 grid -----------------------------------------------------

function ShortsGrid({
  videos,
  onOpen,
}: {
  videos: Video[];
  onOpen: (v: Video) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
      {videos.map((v) => (
        <button
          key={v.id}
          type="button"
          onClick={() => onOpen(v)}
          className="group block text-left"
        >
          <div className="aspect-[9/16] relative overflow-hidden border-2 border-cheeze-purple-deep bg-cheeze-charcoal shadow-[4px_4px_0_var(--cheeze-purple-deep)] group-hover:shadow-[6px_6px_0_var(--cheeze-purple-deep)] transition-shadow lightleak">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={v.thumbnail}
              alt={v.title}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <span className="absolute top-2 left-2 bg-cheeze-yellow text-cheeze-purple-deep text-[10px] font-bold tracking-widest px-1.5 py-0.5">
              SHORTS
            </span>
            {v.durationSec && (
              <span className="absolute bottom-2 right-2 bg-cheeze-charcoal/85 text-cheeze-cream text-[11px] font-mono px-1.5 py-0.5">
                {formatDuration(v.durationSec)}
              </span>
            )}
            <span className="absolute inset-0 grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity bg-cheeze-purple-deep/55">
              <span className="text-cheeze-yellow text-5xl">▶</span>
            </span>
          </div>
          <h3 className="mt-2 text-sm font-bold text-cheeze-ink line-clamp-2 leading-snug">
            {v.title}
          </h3>
          <div className="text-[11px] text-cheeze-olive mt-0.5">
            {formatDate(v.publishedAt)}
          </div>
        </button>
      ))}
    </div>
  );
}

// Cast credits often appear at the bottom of YouTube descriptions in patterns
// like "출연: 이름1, 이름2 / 연출: 이름". Pull those lines out for display.
const CREDIT_KEYS = [
  "출연",
  "주연",
  "조연",
  "연출",
  "감독",
  "각본",
  "촬영",
  "편집",
  "음악",
  "스타일링",
  "기획",
];

function parseCredits(description: string | undefined) {
  if (!description) return [];
  const lines = description.split(/\r?\n/);
  const out: { key: string; value: string }[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^([^:\s]{1,8})\s*[:：]\s*(.+)$/);
    if (!m) continue;
    const key = m[1].trim();
    if (CREDIT_KEYS.includes(key)) {
      out.push({ key, value: m[2].trim() });
    }
  }
  return out;
}

function PlayerModal({
  video,
  onClose,
}: {
  video: Video;
  onClose: () => void;
}) {
  const credits = parseCredits(video.description);

  // Strip credit lines from the body so we don't show them twice.
  const body = video.description
    ?.split(/\r?\n/)
    .filter((line) => {
      const m = line.trim().match(/^([^:\s]{1,8})\s*[:：]/);
      return !m || !CREDIT_KEYS.includes(m[1].trim());
    })
    .join("\n")
    .trim();

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-cheeze-charcoal/85 p-4 backdrop-blur-[2px]"
      onClick={onClose}
      style={{ animation: "fadeIn 200ms ease-out both" }}
    >
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes modalIn{from{opacity:0;transform:translateY(20px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>
      <div
        className={`w-full ${
          video.isShort ? "max-w-md" : "max-w-4xl"
        } max-h-[92vh] overflow-y-auto bg-cheeze-cream border-2 border-cheeze-purple-deep shadow-[8px_8px_0_var(--cheeze-purple-deep)]`}
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "modalIn 320ms cubic-bezier(0.2,0.7,0.2,1) both" }}
      >
        <div
          className={`${
            video.isShort ? "aspect-[9/16]" : "aspect-video"
          } relative bg-cheeze-charcoal`}
        >
          <iframe
            className="absolute inset-0 w-full h-full"
            src={`https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
        <div className="p-4 sm:p-6 grid gap-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3
                className="text-xl sm:text-2xl text-cheeze-ink leading-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {video.title}
              </h3>
              <div className="text-xs text-cheeze-olive mt-1">
                {formatDate(video.publishedAt)}
              </div>
            </div>
            <div className="flex items-center gap-2 ml-auto shrink-0">
              <a
                href={video.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold uppercase tracking-widest px-3 py-2 border-2 border-cheeze-purple-deep hover:bg-cheeze-purple hover:text-cheeze-yellow"
              >
                YouTube에서 보기 ↗
              </a>
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-bold uppercase tracking-widest px-3 py-2 border-2 border-cheeze-purple-deep bg-cheeze-purple text-cheeze-yellow"
              >
                ✕ 닫기
              </button>
            </div>
          </div>

          {credits.length > 0 && (
            <div className="border-2 border-cheeze-purple-deep bg-cheeze-cream-deep/50 p-4">
              <div className="text-[11px] uppercase tracking-[0.3em] text-cheeze-purple mb-3">
                ▣ 크레딧
              </div>
              <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {credits.map((c, i) => (
                  <div key={i} className="flex gap-3">
                    <dt className="text-cheeze-olive font-bold min-w-[3rem] shrink-0">
                      {c.key}
                    </dt>
                    <dd className="text-cheeze-ink-soft">{c.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {body && (
            <div>
              <div className="text-[11px] uppercase tracking-[0.3em] text-cheeze-purple mb-2">
                설명
              </div>
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
