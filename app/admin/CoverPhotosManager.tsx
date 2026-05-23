"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type Cover = { name: string; url: string; size: number };

/** Mirrors `MAX_COVERS` in `app/api/admin/covers/route.ts` — only used
 *  as a fallback before the GET response lands with the real cap. */
const DEFAULT_MAX_COVERS = 10;

/**
 * Admin UI for V2 hero cover photos.
 *
 * Reads /api/admin/covers for the current list, lets the admin drag-drop
 * (or click to browse) new photos, and delete individual ones. Files land
 * in /public/covers/ and the public V2 home auto-detects them on its next
 * request — no rebuild needed.
 */
export default function CoverPhotosManager() {
  const [covers, setCovers] = useState<Cover[]>([]);
  const [maxCovers, setMaxCovers] = useState<number>(DEFAULT_MAX_COVERS);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragHot, setDragHot] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const atCap = covers.length >= maxCovers;
  const remaining = Math.max(0, maxCovers - covers.length);

  async function refresh() {
    try {
      const res = await fetch("/api/admin/covers", { cache: "no-store" });
      if (!res.ok) throw new Error(`list failed (${res.status})`);
      const data = (await res.json()) as { files: Cover[]; maxCovers?: number };
      setCovers(data.files);
      if (typeof data.maxCovers === "number") setMaxCovers(data.maxCovers);
    } catch (e) {
      setError(e instanceof Error ? e.message : "list failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function upload(files: FileList | File[]) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      for (const f of Array.from(files)) form.append("file", f);
      const res = await fetch("/api/admin/covers", {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `upload failed (${res.status})`);
      // Surface per-file skips (wrong extension, oversize, etc.) without
      // blocking the successful ones.
      const skipped = (data.results ?? []).filter((r: { saved: boolean }) => !r.saved);
      if (skipped.length > 0) {
        setError(
          `일부 파일 스킵: ${skipped.map((r: { name: string; reason?: string }) => `${r.name} (${r.reason})`).join(", ")}`,
        );
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function remove(name: string) {
    if (!confirm(`${name} 삭제할까요?`)) return;
    try {
      const res = await fetch(
        `/api/admin/covers/${encodeURIComponent(name)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `delete failed (${res.status})`);
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "delete failed");
    }
  }

  return (
    <div className="space-y-5">
      <div className="text-[13px] text-cheeze-ink-soft leading-relaxed">
        홈 hero에 표시되는 표지 사진을 관리합니다. 가로형 사진 권장 (3:2 / 16:9
        / 16:10). 여러 장 올리면 자동으로 넘어가요. 파일 비어있으면 위쪽 "표지
        영상"이 폴백으로 뜹니다.{" "}
        <strong className="text-cheeze-ink">최대 {maxCovers}장</strong>까지 등록
        가능해요.
      </div>

      {/* Drop zone — disabled at the per-bucket cap so the user can't even
          start an upload. Visual gets a muted look + status caption. */}
      <div
        onDragEnter={(e) => {
          if (atCap) return;
          e.preventDefault();
          setDragHot(true);
        }}
        onDragOver={(e) => {
          if (atCap) return;
          e.preventDefault();
          setDragHot(true);
        }}
        onDragLeave={() => setDragHot(false)}
        onDrop={(e) => {
          if (atCap) return;
          e.preventDefault();
          setDragHot(false);
          if (e.dataTransfer.files) upload(e.dataTransfer.files);
        }}
        onClick={() => {
          if (atCap) return;
          inputRef.current?.click();
        }}
        aria-disabled={atCap}
        className={`relative border-2 border-dashed rounded-md p-8 text-center transition-colors ${
          atCap
            ? "border-cheeze-purple-deep/15 bg-cheeze-cream-deep/30 cursor-not-allowed opacity-70"
            : dragHot
              ? "border-cheeze-purple bg-cheeze-purple/5 cursor-pointer"
              : "border-cheeze-purple-deep/25 hover:border-cheeze-purple-deep/45 bg-white cursor-pointer"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={atCap}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) upload(e.target.files);
            e.target.value = ""; // allow re-selecting the same file
          }}
        />
        <div className="text-sm font-bold text-cheeze-ink mb-1">
          {atCap
            ? `한도 도달 · ${maxCovers}장 모두 사용 중`
            : uploading
              ? "올리는 중…"
              : "사진을 여기로 드래그하거나, 눌러서 선택"}
        </div>
        <div className="text-xs text-cheeze-ink-soft">
          {atCap
            ? "새 표지를 올리려면 아래에서 기존 사진을 먼저 삭제해주세요."
            : `JPG · PNG · WebP / 최대 10MB / 한 번에 ${remaining}장까지 (전체 한도 ${maxCovers}장)`}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-amber-300 bg-amber-50 text-amber-900 text-sm px-4 py-3">
          {error}
        </div>
      )}

      {/* Current list */}
      <div>
        <div className="text-[11px] uppercase tracking-[0.2em] text-cheeze-olive mb-3">
          현재 표지 사진 · {covers.length} / {maxCovers}장
        </div>
        {loading ? (
          <div className="text-sm text-cheeze-ink-soft">불러오는 중…</div>
        ) : covers.length === 0 ? (
          <div className="text-sm text-cheeze-ink-soft border border-cheeze-purple-deep/10 rounded-md p-6 text-center bg-white">
            아직 올라온 사진이 없어요. 위에서 업로드하면 V2 홈에 바로 뜹니다.
          </div>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {covers.map((c) => (
              <li
                key={c.name}
                className="group relative border border-cheeze-purple-deep/15 rounded-md overflow-hidden bg-white"
              >
                <div className="relative aspect-[3/2] bg-cheeze-charcoal/5">
                  <Image
                    src={c.url}
                    alt={c.name}
                    fill
                    sizes="(min-width: 1024px) 25vw, 50vw"
                    className="object-cover"
                  />
                </div>
                <div className="px-3 py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-mono truncate text-cheeze-ink">
                      {c.name}
                    </div>
                    <div className="text-[10px] text-cheeze-olive">
                      {Math.round(c.size / 1024)} KB
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(c.name)}
                    className="text-[11px] font-bold tracking-widest uppercase px-2 py-1.5 border border-red-300 text-red-700 hover:bg-red-50 transition-colors"
                  >
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
