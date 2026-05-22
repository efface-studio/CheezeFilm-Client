"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

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
};

export default function MembersCrud({ members }: { members: Member[] }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="text-sm font-semibold px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700"
        >
          + 멤버 추가
        </button>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden divide-y divide-zinc-100">
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
      <div className="bg-zinc-50/60 p-5">
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
    <div className="p-4 flex items-center justify-between gap-4 hover:bg-zinc-50">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-zinc-900">
          {member.name}
          <span className="ml-2 text-zinc-400 font-normal text-xs">
            {member.nameEn}
          </span>
          {member.uncertain && (
            <span className="ml-2 inline-block text-[10px] uppercase tracking-wider bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded align-middle">
              추정
            </span>
          )}
        </div>
        <div className="text-xs text-zinc-500 truncate mt-0.5">
          {member.roleLabel || "—"} · {member.highlight || "—"}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <code className="text-[10px] text-zinc-400 font-mono">
          {member.slug}
        </code>
        <button
          type="button"
          onClick={onEdit}
          className="text-xs font-semibold px-3 py-1.5 rounded border border-zinc-300 text-zinc-700 hover:bg-zinc-100"
        >
          수정
        </button>
      </div>
    </div>
  );
}

function NewMemberDialog({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-zinc-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between">
          <h3 className="font-bold">새 멤버 추가</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-900 text-lg"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
        <div className="p-5">
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
    <form onSubmit={submit} className="grid gap-3 text-sm">
      <Row label="이름 *">
        <input
          required
          value={m.name}
          onChange={(e) => set("name", e.target.value)}
          className="field"
          placeholder="홍길동"
        />
      </Row>
      <Row label="영문 이름">
        <input
          value={m.nameEn}
          onChange={(e) => set("nameEn", e.target.value)}
          className="field"
          placeholder="Hong Gil-dong"
        />
      </Row>
      <div className="grid sm:grid-cols-2 gap-3">
        <Row label="역할">
          <select
            value={m.role}
            onChange={(e) => set("role", e.target.value)}
            className="field"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </Row>
        <Row label="역할 라벨">
          <input
            value={m.roleLabel}
            onChange={(e) => set("roleLabel", e.target.value)}
            className="field"
            placeholder="배우 · 모델"
          />
        </Row>
      </div>
      <Row label="한 줄 하이라이트">
        <input
          value={m.highlight}
          onChange={(e) => set("highlight", e.target.value)}
          className="field"
          placeholder="다작여왕"
        />
      </Row>
      <Row label="소개">
        <textarea
          value={m.bio}
          onChange={(e) => set("bio", e.target.value)}
          rows={3}
          className="field"
        />
      </Row>
      <Row label="대표작 (줄바꿈으로 구분)">
        <textarea
          value={worksText}
          onChange={(e) => setWorksText(e.target.value)}
          rows={3}
          className="field font-mono"
          placeholder="작품1&#10;작품2"
        />
      </Row>
      <div className="grid sm:grid-cols-3 gap-3">
        <Row label="합류 메모">
          <input
            value={m.joinedNote ?? ""}
            onChange={(e) => set("joinedNote", e.target.value)}
            className="field"
            placeholder="2019 합류"
          />
        </Row>
        <Row label="Instagram 핸들">
          <input
            value={m.instagram ?? ""}
            onChange={(e) => set("instagram", e.target.value)}
            className="field"
            placeholder="cheezefilm.ceo"
          />
        </Row>
        <Row label="출처 URL">
          <input
            value={m.sourceUrl ?? ""}
            onChange={(e) => set("sourceUrl", e.target.value)}
            className="field"
            placeholder="https://"
          />
        </Row>
      </div>
      <Row label="액센트 컬러">
        <div className="flex gap-2">
          {ACCENTS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => set("accent", a)}
              className={`px-3 py-1.5 text-xs rounded border ${
                m.accent === a
                  ? "border-purple-600 bg-purple-50 text-purple-800 font-semibold"
                  : "border-zinc-300 text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </Row>
      <Row label="정보 신뢰도">
        <label className="inline-flex items-center gap-2 text-xs text-zinc-600">
          <input
            type="checkbox"
            checked={!!m.uncertain}
            onChange={(e) => set("uncertain", e.target.checked)}
            className="rounded border-zinc-300"
          />
          일부 정보 추정으로 표시
        </label>
      </Row>

      {error && (
        <div className="rounded bg-rose-50 border border-rose-200 px-3 py-2 text-rose-700 text-xs">
          ⚠ {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-3 mt-2 border-t border-zinc-200">
        <div>
          {allowDelete && (
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="text-xs font-semibold px-3 py-1.5 rounded border border-rose-300 text-rose-700 hover:bg-rose-50"
            >
              삭제
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="text-xs font-semibold px-3 py-1.5 rounded border border-zinc-300 text-zinc-700 hover:bg-zinc-100"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={busy}
            className="text-xs font-semibold px-4 py-1.5 rounded bg-purple-600 text-white hover:bg-purple-700 disabled:bg-zinc-300"
          >
            {busy ? "저장 중..." : submitLabel}
          </button>
        </div>
      </div>

      <style jsx>{`
        :global(.field) {
          width: 100%;
          border: 1px solid rgb(212 212 216);
          border-radius: 6px;
          padding: 6px 10px;
          font-size: 13px;
        }
        :global(.field:focus) {
          outline: none;
          border-color: rgb(147 51 234);
          box-shadow: 0 0 0 2px rgb(243 232 255);
        }
      `}</style>
    </form>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid sm:grid-cols-[160px_1fr] gap-x-3 gap-y-1 items-start">
      <span className="text-xs font-semibold text-zinc-600 pt-1.5">{label}</span>
      <div>{children}</div>
    </label>
  );
}
