"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type PickerVideo = {
  id: string;
  title: string;
  publishedAt: string;
  thumbnail: string;
};

const SLOT_KEYS = [
  "works.1.videoId",
  "works.2.videoId",
  "works.3.videoId",
] as const;

/**
 * Admin picker for the V2 hero slideshow ("이번 호의 한 컷").
 *
 * Pins 3 videos that the V2 home hero cycles through. Selection is stored
 * in the `works.{1,2,3}.videoId` content keys (same keys the public site
 * already reads). Saves through the existing `/api/admin/content` PUT.
 *
 * UX:
 *   · Top: three numbered slots showing the currently pinned thumbnails.
 *   · Bottom: full longform list. Click a row → fills the next empty slot.
 *     Click a filled slot → clears it.
 *   · Click 저장 → writes all three keys in parallel + router.refresh().
 */
export default function IssueCoverPicker({
  videos,
  initial,
}: {
  videos: PickerVideo[];
  initial: [string, string, string];
}) {
  const router = useRouter();
  const [slots, setSlots] = useState<[string, string, string]>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [, startTransition] = useTransition();

  const videosById = useMemo(() => {
    const m = new Map<string, PickerVideo>();
    for (const v of videos) m.set(v.id, v);
    return m;
  }, [videos]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return videos;
    return videos.filter((v) => v.title.toLowerCase().includes(needle));
  }, [videos, q]);

  function pickVideo(id: string) {
    setSlots((prev) => {
      // Already pinned somewhere → toggle off.
      const existing = prev.findIndex((s) => s === id);
      if (existing >= 0) {
        const next = [...prev] as [string, string, string];
        next[existing] = "";
        return next;
      }
      // Otherwise fill the first empty slot.
      const emptyIdx = prev.findIndex((s) => !s);
      if (emptyIdx < 0) return prev; // all full — ignore (admin clears first)
      const next = [...prev] as [string, string, string];
      next[emptyIdx] = id;
      return next;
    });
  }

  function clearSlot(slotIdx: number) {
    setSlots((prev) => {
      const next = [...prev] as [string, string, string];
      next[slotIdx] = "";
      return next;
    });
  }

  function isDirty(): boolean {
    return slots.some((s, i) => s !== initial[i]);
  }

  async function save() {
    setBusy(true);
    setError("");
    try {
      const results = await Promise.all(
        SLOT_KEYS.map((key, i) =>
          fetch("/api/admin/content", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key, value: slots[i] }),
          }),
        ),
      );
      const failed = results.find((r) => !r.ok);
      if (failed) {
        const err = (await failed
          .json()
          .catch(() => ({ error: "저장 실패" }))) as { error?: string };
        throw new Error(err.error ?? "저장 실패");
      }
      setSavedAt(Date.now());
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Selected slots ───────────────────────────── */}
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {slots.map((id, i) => {
            const v = id ? videosById.get(id) : null;
            return (
              <SlotCard
                key={i}
                index={i + 1}
                video={v}
                rawId={id}
                onClear={() => clearSlot(i)}
              />
            );
          })}
        </div>
      </section>

      {/* ── Save bar ─────────────────────────────────── */}
      <div className="sticky top-[60px] z-10 flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white border border-zinc-200 shadow-sm">
        <div className="text-sm text-zinc-600">
          <span className="font-bold text-zinc-900">
            {slots.filter(Boolean).length} / 3
          </span>{" "}
          선택됨
          {error && (
            <span className="ml-3 text-rose-600 text-xs">{error}</span>
          )}
          {savedAt && !isDirty() && (
            <span className="ml-3 text-emerald-600 text-xs">
              저장 완료 — V2 홈에 즉시 반영됨.
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSlots(initial)}
            disabled={busy || !isDirty()}
            className="text-sm font-bold px-3 py-2 rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            되돌리기
          </button>
          <button
            type="button"
            onClick={save}
            disabled={busy || !isDirty()}
            className="text-sm font-bold px-5 py-2 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 active:scale-[0.98] transition-all disabled:bg-zinc-300 disabled:cursor-not-allowed"
          >
            {busy ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>

      {/* ── Video picker grid ───────────────────────── */}
      <section>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-sm font-bold text-zinc-900">
            영상 선택
            <span className="ml-2 text-xs font-normal text-zinc-500">
              총 {videos.length}편 · 클릭해서 슬롯에 핀
            </span>
          </h3>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="제목 검색…"
            className="text-sm px-3 py-2 rounded-lg border border-zinc-200 bg-white w-64 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
          />
        </div>

        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map((v) => {
            const pinned = slots.indexOf(v.id);
            const isPinned = pinned >= 0;
            const allFull = slots.every(Boolean) && !isPinned;
            return (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => pickVideo(v.id)}
                  disabled={allFull}
                  className={`group block w-full text-left rounded-lg overflow-hidden border-2 transition-all ${
                    isPinned
                      ? "border-purple-600 ring-2 ring-purple-200"
                      : allFull
                        ? "border-zinc-200 opacity-40 cursor-not-allowed"
                        : "border-zinc-200 hover:border-zinc-400"
                  }`}
                >
                  <div className="aspect-video relative bg-zinc-100">
                    <Image
                      src={v.thumbnail}
                      alt={v.title}
                      fill
                      sizes="(min-width: 1024px) 200px, (min-width: 640px) 25vw, 50vw"
                      className="object-cover"
                      loading="lazy"
                    />
                    {isPinned && (
                      <div className="absolute top-2 left-2 w-7 h-7 rounded-full bg-purple-600 text-white text-sm font-bold grid place-items-center shadow-md">
                        {pinned + 1}
                      </div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <div className="text-[12px] font-semibold text-zinc-900 line-clamp-2 leading-tight">
                      {v.title}
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-1 tabular-nums">
                      {new Date(v.publishedAt).toLocaleDateString("ko-KR")}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
        {filtered.length === 0 && (
          <div className="py-10 text-center text-sm text-zinc-500">
            검색 결과가 없어요.
          </div>
        )}
      </section>
    </div>
  );
}

function SlotCard({
  index,
  video,
  rawId,
  onClear,
}: {
  index: number;
  video: PickerVideo | null | undefined;
  rawId: string;
  onClear: () => void;
}) {
  const filled = !!rawId;
  return (
    <div
      className={`rounded-xl border-2 ${
        filled ? "border-purple-300 bg-purple-50/40" : "border-dashed border-zinc-300 bg-zinc-50/60"
      } p-3`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] font-bold tracking-wider uppercase text-purple-700">
          슬롯 {index}
        </div>
        {filled && (
          <button
            type="button"
            onClick={onClear}
            className="text-[11px] font-semibold text-zinc-500 hover:text-rose-600"
          >
            비우기
          </button>
        )}
      </div>
      {filled && video ? (
        <div className="space-y-2">
          <div className="aspect-video relative rounded-lg overflow-hidden bg-zinc-100">
            <Image
              src={video.thumbnail}
              alt={video.title}
              fill
              sizes="33vw"
              className="object-cover"
            />
          </div>
          <div className="text-[13px] font-bold text-zinc-900 line-clamp-2 leading-tight">
            {video.title}
          </div>
          <code className="text-[10px] text-zinc-400 font-mono">{rawId}</code>
        </div>
      ) : filled ? (
        // ID set but video not in current list (e.g. private/deleted)
        <div className="aspect-video rounded-lg bg-zinc-100 grid place-items-center text-xs text-zinc-500 px-3 text-center">
          영상을 찾을 수 없어요
          <br />
          <code className="text-[10px] text-zinc-400 font-mono">{rawId}</code>
        </div>
      ) : (
        <div className="aspect-video rounded-lg grid place-items-center text-xs text-zinc-400 italic">
          ↓ 아래 그리드에서 선택
        </div>
      )}
    </div>
  );
}
