"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import CastSyncButton from "./CastSyncButton";
import PhotoFetchButton from "./PhotoFetchButton";

const ACCENTS = ["purple", "yellow", "wine", "charcoal", "olive", "cream"] as const;
const ROLES = [
  { value: "director", label: "감독·대표" },
  { value: "writer", label: "작가" },
  { value: "lead", label: "주연" },
  { value: "actor", label: "배우" },
] as const;

type Member = {
  slug: string;
  name: string;
  nameEn: string;
  role: string;
  roleLabel: string;
  highlight: string;
  bio: string;
  works: string[];
  joinedNote?: string;
  instagram?: string;
  sourceUrl?: string;
  accent: string;
  uncertain?: boolean;
  /** Resolved photo URL or null when unset. Photos live on disk and the
   *  server-side page resolves them in `resolveMemberPhoto`. */
  photoUrl?: string | null;
};

export default function MembersCrud({ members }: { members: Member[] }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2 flex-wrap">
        <CastSyncButton />
        <PhotoFetchButton />
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="text-sm font-bold px-4 py-2.5 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 active:scale-[0.98] transition-all"
        >
          멤버 추가
        </button>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden divide-y divide-zinc-100">
        {members.length === 0 && (
          <div className="p-12 text-center text-sm text-zinc-500">
            아직 등록된 멤버가 없어요.
          </div>
        )}
        {members.map((m) => (
          <MemberRow
            key={m.slug}
            member={m}
            isEditing={editing === m.slug}
            onEdit={() => setEditing(m.slug)}
            onCancel={() => setEditing(null)}
            onSaved={() => setEditing(null)}
          />
        ))}
      </div>

      {editing === "new" && (
        <NewMemberDialog onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function MemberRow({
  member,
  isEditing,
  onEdit,
  onCancel,
  onSaved,
}: {
  member: Member;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSaved: () => void;
}) {
  if (isEditing) {
    return (
      <div className="bg-zinc-50/60">
        <MemberForm
          initial={member}
          submitLabel="저장"
          onSubmit={async (patch) => {
            const res = await fetch(`/api/admin/members/${member.slug}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(patch),
            });
            if (!res.ok) {
              const d = (await res.json().catch(() => ({}))) as { error?: string };
              throw new Error(d.error ?? "저장 실패");
            }
          }}
          onDone={onSaved}
          onCancel={onCancel}
          allowDelete
          deleteSlug={member.slug}
        />
      </div>
    );
  }

  return (
    <div className="p-4 flex items-center justify-between gap-4 hover:bg-zinc-50 transition-colors">
      <div className="flex items-center gap-4 min-w-0">
        <PhotoThumbnail member={member} />
        <div className="min-w-0">
          <div className="text-sm font-bold text-zinc-900 flex items-center gap-2 flex-wrap">
            {member.name}
            <span className="text-zinc-400 font-normal text-xs">
              {member.nameEn}
            </span>
            {member.uncertain && (
              <span className="text-[10px] uppercase tracking-wider bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                추정
              </span>
            )}
          </div>
          <div className="text-xs text-zinc-500 truncate mt-0.5">
            {member.roleLabel || "—"} · {member.highlight || "—"}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <code className="text-[10px] text-zinc-400 font-mono">{member.slug}</code>
        <button
          type="button"
          onClick={onEdit}
          className="text-xs font-bold px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-100"
        >
          수정
        </button>
      </div>
    </div>
  );
}

/**
 * Compact circular portrait thumbnail with status dot. Click opens the
 * row's edit mode — photo management lives inside the edit form, not on
 * the row itself, to keep the row scannable.
 */
function PhotoThumbnail({ member }: { member: Member }) {
  const initial = member.name.charAt(0);
  return (
    <div className="relative w-12 h-12 rounded-full overflow-hidden bg-zinc-100 grid place-items-center text-zinc-400 font-bold shrink-0">
      {member.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={member.photoUrl}
          alt={member.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="text-sm">{initial}</span>
      )}
      <span
        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
          member.photoUrl ? "bg-emerald-500" : "bg-zinc-300"
        }`}
        title={member.photoUrl ? "사진 등록됨" : "사진 없음"}
      />
    </div>
  );
}

function NewMemberDialog({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-zinc-900/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-white rounded-xl shadow-2xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="font-bold text-lg">새 멤버 추가</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 grid place-items-center"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
        <MemberForm
          initial={emptyMember()}
          submitLabel="추가"
          onSubmit={async (data) => {
            const res = await fetch("/api/admin/members", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data),
            });
            if (!res.ok) {
              const d = (await res.json().catch(() => ({}))) as {
                error?: string;
              };
              throw new Error(d.error ?? "추가 실패");
            }
          }}
          onDone={onClose}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}

function emptyMember(): Member {
  return {
    slug: "",
    name: "",
    nameEn: "",
    role: "actor",
    roleLabel: "",
    highlight: "",
    bio: "",
    works: [],
    accent: "purple",
    photoUrl: null,
  };
}

function MemberForm({
  initial,
  submitLabel,
  onSubmit,
  onDone,
  onCancel,
  allowDelete,
  deleteSlug,
}: {
  initial: Member;
  submitLabel: string;
  onSubmit: (data: Partial<Member>) => Promise<void>;
  onDone: () => void;
  onCancel: () => void;
  allowDelete?: boolean;
  deleteSlug?: string;
}) {
  const router = useRouter();
  const [m, setM] = useState<Member>(initial);
  const [worksText, setWorksText] = useState(initial.works.join("\n"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  function set<K extends keyof Member>(k: K, v: Member[K]) {
    setM((prev) => ({ ...prev, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSubmit({
        ...m,
        works: worksText
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      startTransition(() => router.refresh());
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!deleteSlug) return;
    if (
      !confirm(
        `${m.name} 멤버를 정말 삭제할까요? 업로드한 사진도 함께 사라집니다.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/members/${deleteSlug}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("삭제 실패");
      startTransition(() => router.refresh());
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid lg:grid-cols-[220px_1fr] gap-6 p-6">
      {/* Left rail — photo card */}
      <PhotoCard
        slug={deleteSlug ?? null}
        name={m.name}
        photoUrl={m.photoUrl ?? null}
        onChange={(url) => set("photoUrl", url)}
        onError={setError}
      />

      {/* Right column — fields */}
      <div className="min-w-0 space-y-5">
        <div>
          <Label>이름 *</Label>
          <input
            required
            value={m.name}
            onChange={(e) => set("name", e.target.value)}
            className="field"
            placeholder="홍길동"
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>영문 이름</Label>
            <input
              value={m.nameEn}
              onChange={(e) => set("nameEn", e.target.value)}
              className="field"
              placeholder="Hong Gil-dong"
            />
          </div>
          <div>
            <Label>역할 라벨</Label>
            <input
              value={m.roleLabel}
              onChange={(e) => set("roleLabel", e.target.value)}
              className="field"
              placeholder="배우 · 모델"
            />
          </div>
        </div>
        <div>
          <Label>역할 분류</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ROLES.map((r) => {
              const active = m.role === r.value;
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => set("role", r.value)}
                  className={`text-sm font-bold px-3 py-2 rounded-lg border-2 transition-all ${
                    active
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"
                  }`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <Label>한 줄 하이라이트</Label>
          <input
            value={m.highlight}
            onChange={(e) => set("highlight", e.target.value)}
            className="field"
            placeholder="다작여왕"
          />
        </div>
        <div>
          <Label>소개</Label>
          <textarea
            value={m.bio}
            onChange={(e) => set("bio", e.target.value)}
            rows={3}
            className="field"
          />
        </div>
        <div>
          <Label>대표작 (한 줄에 하나)</Label>
          <textarea
            value={worksText}
            onChange={(e) => setWorksText(e.target.value)}
            rows={3}
            className="field font-mono text-xs"
            placeholder="작품1&#10;작품2"
          />
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <Label>합류 메모</Label>
            <input
              value={m.joinedNote ?? ""}
              onChange={(e) => set("joinedNote", e.target.value)}
              className="field"
              placeholder="2019 합류"
            />
          </div>
          <div>
            <Label>Instagram 핸들</Label>
            <input
              value={m.instagram ?? ""}
              onChange={(e) => set("instagram", e.target.value)}
              className="field"
              placeholder="cheezefilm.ceo"
            />
          </div>
          <div>
            <Label>출처 URL</Label>
            <input
              value={m.sourceUrl ?? ""}
              onChange={(e) => set("sourceUrl", e.target.value)}
              className="field"
              placeholder="https://"
            />
          </div>
        </div>
        <div>
          <Label>액센트 컬러</Label>
          <div className="flex gap-2 flex-wrap">
            {ACCENTS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => set("accent", a)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border-2 capitalize transition-all ${
                  m.accent === a
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-200 text-zinc-700 hover:border-zinc-400"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
        <label className="inline-flex items-center gap-2 text-xs text-zinc-600 font-medium">
          <input
            type="checkbox"
            checked={!!m.uncertain}
            onChange={(e) => set("uncertain", e.target.checked)}
            className="rounded border-zinc-300"
          />
          일부 정보 추정으로 표시
        </label>

        {error && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-rose-700 text-sm">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-4 border-t border-zinc-200">
          <div>
            {allowDelete && (
              <button
                type="button"
                onClick={remove}
                disabled={busy}
                className="text-sm font-bold px-3 py-2 rounded-lg text-zinc-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
              >
                멤버 삭제
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="text-sm font-bold px-4 py-2 rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={busy || !m.name.trim()}
              className="text-sm font-bold px-5 py-2 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 disabled:bg-zinc-300 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
            >
              {busy ? "저장 중…" : submitLabel}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        :global(.field) {
          width: 100%;
          border: 1px solid rgb(228 228 231);
          border-radius: 8px;
          padding: 9px 12px;
          font-size: 13px;
          background: white;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        :global(.field:focus) {
          outline: none;
          border-color: rgb(147 51 234);
          box-shadow: 0 0 0 3px rgb(243 232 255);
        }
      `}</style>
    </form>
  );
}

/**
 * Inline photo upload card — was a separate "멤버 사진" tab; now lives
 * in the edit form's left rail. Click to pick, drag-drop to upload,
 * dedicated 교체 / 삭제 affordances when populated. Operations hit the
 * same `/api/admin/members/[slug]/photo` endpoints as before.
 *
 * For brand-new members (no slug yet) the card just shows a placeholder
 * since there's nothing to upload against — the photo step is performed
 * after the member is created.
 */
function PhotoCard({
  slug,
  name,
  photoUrl,
  onChange,
  onError,
}: {
  slug: string | null;
  name: string;
  photoUrl: string | null;
  onChange: (url: string | null) => void;
  onError: (msg: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [hovering, setHovering] = useState(false);
  const initial = name.charAt(0) || "?";
  const disabled = !slug;

  async function upload(file: File) {
    if (!slug) return;
    setBusy(true);
    onError("");
    try {
      const form = new FormData();
      form.append("photo", file);
      const res = await fetch(`/api/admin/members/${slug}/photo`, {
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
      onChange(URL.createObjectURL(file));
    } catch (e) {
      onError(e instanceof Error ? e.message : "사진 업로드 오류");
    } finally {
      setBusy(false);
    }
  }

  async function removePhoto() {
    if (!slug) return;
    if (!confirm(`${name || "이"} 멤버 사진을 삭제할까요?`)) return;
    setBusy(true);
    onError("");
    try {
      const res = await fetch(`/api/admin/members/${slug}/photo`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "삭제 실패");
      }
      onChange(null);
    } catch (e) {
      onError(e instanceof Error ? e.message : "사진 삭제 오류");
    } finally {
      setBusy(false);
    }
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setHovering(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  }

  return (
    <aside className="space-y-3">
      <div>
        <h4 className="text-[13px] font-bold text-zinc-900 mb-2">멤버 사진</h4>
        <div
          onDragOver={(e) => {
            if (disabled) return;
            e.preventDefault();
            setHovering(true);
          }}
          onDragLeave={() => setHovering(false)}
          onDrop={onDrop}
          onClick={() => {
            if (!disabled) inputRef.current?.click();
          }}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          className={`relative aspect-[4/5] rounded-xl overflow-hidden ring-1 transition-all ${
            disabled
              ? "ring-zinc-200 bg-zinc-50 cursor-not-allowed"
              : hovering
                ? "ring-2 ring-purple-500 bg-purple-50 cursor-copy"
                : "ring-zinc-200 bg-zinc-100 hover:ring-zinc-300 cursor-pointer"
          }`}
        >
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt={name}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-center px-4">
              <div>
                <div className="w-16 h-16 mx-auto rounded-full bg-white grid place-items-center text-2xl font-bold text-zinc-400 shadow-sm">
                  {initial}
                </div>
                <div className="mt-3 text-xs font-semibold text-zinc-500">
                  {disabled ? "저장 후 업로드" : "사진 없음"}
                </div>
                {!disabled && (
                  <div className="mt-1 text-[11px] text-zinc-400">
                    클릭 · 드래그 업로드
                  </div>
                )}
              </div>
            </div>
          )}

          {photoUrl && !busy && !hovering && !disabled && (
            <div className="absolute inset-0 grid place-items-center bg-zinc-900/0 hover:bg-zinc-900/40 transition-colors opacity-0 hover:opacity-100">
              <span className="text-white text-xs font-bold tracking-wider uppercase border border-white/40 px-3 py-1.5 rounded-full">
                교체
              </span>
            </div>
          )}

          {busy && (
            <div className="absolute inset-0 grid place-items-center bg-white/90 text-zinc-700 text-sm font-bold">
              <div className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
                업로드 중…
              </div>
            </div>
          )}

          {hovering && !busy && !disabled && (
            <div className="absolute inset-0 grid place-items-center bg-purple-100/90 text-purple-700 text-sm font-bold pointer-events-none">
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
      </div>

      {!disabled && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex-1 text-xs font-bold px-3 py-2 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 disabled:bg-zinc-300"
          >
            {photoUrl ? "교체" : "업로드"}
          </button>
          {photoUrl && (
            <button
              type="button"
              onClick={removePhoto}
              disabled={busy}
              className="text-xs font-bold px-3 py-2 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700"
            >
              삭제
            </button>
          )}
        </div>
      )}

      <p className="text-[11px] text-zinc-500 leading-relaxed">
        JPEG · PNG · WebP, 8MB 이하. 4:5 비율로 자동 표시됩니다.
      </p>
    </aside>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[12px] font-bold text-zinc-700 mb-1.5">{children}</div>
  );
}
