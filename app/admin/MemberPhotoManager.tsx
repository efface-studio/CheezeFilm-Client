"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  member: {
    slug: string;
    name: string;
    nameEn: string;
    roleLabel: string;
    accent: string;
    photoUrl: string | null;
  };
};

export default function MemberPhotoManager({ member }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hovering, setHovering] = useState(false);
  // Optimistic preview that survives until refresh resolves
  const [optimisticUrl, setOptimisticUrl] = useState<string | null>(null);

  const photoUrl = optimisticUrl ?? member.photoUrl;
  const initial = member.name.charAt(0);

  async function upload(file: File) {
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("photo", file);
      const res = await fetch(`/api/admin/members/${member.slug}/photo`, {
        method: "POST",
        body: form,
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        photoUrl?: string;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "업로드 실패");
      }
      setOptimisticUrl(URL.createObjectURL(file));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했어요.");
    } finally {
      setBusy(false);
    }
  }

  async function removePhoto() {
    if (!confirm(`${member.name} 사진을 삭제할까요?`)) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/members/${member.slug}/photo`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "삭제 실패");
      }
      setOptimisticUrl(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했어요.");
    } finally {
      setBusy(false);
    }
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setHovering(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  }

  return (
    <div className="group rounded-lg border border-zinc-200 bg-white overflow-hidden hover:border-zinc-300 hover:shadow-sm transition-all">
      {/* Photo / dropzone area */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setHovering(true);
        }}
        onDragLeave={() => setHovering(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={`relative aspect-[4/5] cursor-pointer overflow-hidden ${
          hovering
            ? "bg-purple-50 ring-2 ring-purple-400 ring-inset"
            : photoUrl
              ? "bg-zinc-100"
              : "bg-zinc-50 border-b border-dashed border-zinc-300"
        }`}
      >
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt={member.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-center px-4">
            <div>
              <div className="w-16 h-16 mx-auto rounded-full bg-zinc-200 grid place-items-center text-2xl font-bold text-zinc-500">
                {initial}
              </div>
              <div className="mt-3 text-xs text-zinc-500">
                사진 없음
              </div>
              <div className="mt-1 text-[11px] text-zinc-400">
                클릭하거나 드래그
              </div>
            </div>
          </div>
        )}

        {/* Hover affordance on populated photos */}
        {photoUrl && !busy && !hovering && (
          <div className="absolute inset-0 grid place-items-center bg-zinc-900/0 group-hover:bg-zinc-900/40 transition-colors opacity-0 group-hover:opacity-100">
            <span className="text-white text-xs font-semibold tracking-wider uppercase border border-white/40 px-3 py-1.5 rounded">
              교체
            </span>
          </div>
        )}

        {busy && (
          <div className="absolute inset-0 grid place-items-center bg-white/90 text-zinc-700 text-sm font-semibold">
            <div className="flex items-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
              업로드 중…
            </div>
          </div>
        )}

        {hovering && !busy && (
          <div className="absolute inset-0 grid place-items-center bg-purple-100/80 text-purple-700 text-sm font-semibold pointer-events-none">
            여기로 놓기
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />

      {/* Meta row */}
      <div className="px-4 py-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-zinc-900 truncate">
            {member.name}
            {photoUrl && (
              <span className="ml-2 inline-block text-[10px] uppercase tracking-wider bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded align-middle">
                등록
              </span>
            )}
          </div>
          <div className="text-[11px] text-zinc-500 truncate mt-0.5">
            {member.nameEn} · {member.roleLabel}
          </div>
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
            disabled={busy}
            className="text-[11px] font-semibold px-2.5 py-1 rounded bg-purple-600 text-white hover:bg-purple-700 disabled:bg-zinc-300 disabled:cursor-not-allowed transition-colors"
          >
            {photoUrl ? "교체" : "업로드"}
          </button>
          {photoUrl && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removePhoto();
              }}
              disabled={busy}
              className="text-[11px] font-semibold px-2.5 py-1 rounded border border-zinc-300 text-zinc-600 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700 transition-colors"
            >
              삭제
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="px-4 pb-3">
          <div className="rounded bg-rose-50 border border-rose-200 px-2.5 py-1.5 text-[11px] text-rose-700">
            ⚠ {error}
          </div>
        </div>
      )}
    </div>
  );
}
