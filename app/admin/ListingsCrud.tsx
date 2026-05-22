"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Listing = {
  id: number;
  title: string;
  description: string;
  role_type: "lead" | "support" | "extra" | "staff";
  requirements: string;
  deadline: string | null;
  status: "draft" | "open" | "closed";
  created_at: string;
  updated_at: string;
};

const ROLE_OPTIONS: { value: Listing["role_type"]; label: string }[] = [
  { value: "lead", label: "주연" },
  { value: "support", label: "조연" },
  { value: "extra", label: "단역" },
  { value: "staff", label: "스태프" },
];

const STATUS_BADGE: Record<Listing["status"], string> = {
  draft: "bg-zinc-100 text-zinc-700",
  open: "bg-emerald-100 text-emerald-800",
  closed: "bg-rose-100 text-rose-800",
};

const STATUS_LABEL: Record<Listing["status"], string> = {
  draft: "초안",
  open: "모집중",
  closed: "마감",
};

export default function ListingsCrud({ listings }: { listings: Listing[] }) {
  const [editing, setEditing] = useState<number | "new" | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="text-sm font-semibold px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700"
        >
          + 새 공고
        </button>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden divide-y divide-zinc-100">
        {listings.length === 0 && (
          <div className="p-12 text-center text-sm text-zinc-500">
            아직 등록된 공고가 없어요. 우상단의 “+ 새 공고” 버튼으로 추가하세요.
          </div>
        )}
        {listings.map((l) =>
          editing === l.id ? (
            <div key={l.id} className="bg-zinc-50/60 p-5">
              <ListingForm
                initial={l}
                submitLabel="저장"
                onSubmit={async (patch) => {
                  const res = await fetch(`/api/admin/audition-listings/${l.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(patch),
                  });
                  if (!res.ok) {
                    const d = (await res.json().catch(() => ({}))) as { error?: string };
                    throw new Error(d.error ?? "저장 실패");
                  }
                }}
                onDone={() => setEditing(null)}
                onCancel={() => setEditing(null)}
                allowDelete
                deleteId={l.id}
              />
            </div>
          ) : (
            <ListingRow key={l.id} listing={l} onEdit={() => setEditing(l.id)} />
          ),
        )}
      </div>

      {editing === "new" && (
        <NewListingDialog onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function ListingRow({
  listing,
  onEdit,
}: {
  listing: Listing;
  onEdit: () => void;
}) {
  return (
    <div className="p-4 flex items-center justify-between gap-4 hover:bg-zinc-50">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
          {listing.title}
          <span
            className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${STATUS_BADGE[listing.status]}`}
          >
            {STATUS_LABEL[listing.status]}
          </span>
        </div>
        <div className="text-xs text-zinc-500 truncate mt-0.5">
          {ROLE_OPTIONS.find((r) => r.value === listing.role_type)?.label} ·{" "}
          {listing.deadline ? `마감 ${listing.deadline}` : "마감일 미정"} ·{" "}
          {new Date(listing.created_at).toLocaleDateString("ko-KR")}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <code className="text-[10px] text-zinc-400 font-mono">#{listing.id}</code>
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

function NewListingDialog({ onClose }: { onClose: () => void }) {
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
          <h3 className="font-bold">새 공고 추가</h3>
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
          <ListingForm
            initial={emptyListing()}
            submitLabel="추가"
            onSubmit={async (data) => {
              const res = await fetch("/api/admin/audition-listings", {
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

function emptyListing(): Listing {
  return {
    id: 0,
    title: "",
    description: "",
    role_type: "lead",
    requirements: "",
    deadline: null,
    status: "draft",
    created_at: "",
    updated_at: "",
  };
}

function ListingForm({
  initial,
  submitLabel,
  onSubmit,
  onDone,
  onCancel,
  allowDelete,
  deleteId,
}: {
  initial: Listing;
  submitLabel: string;
  onSubmit: (data: Partial<Listing>) => Promise<void>;
  onDone: () => void;
  onCancel: () => void;
  allowDelete?: boolean;
  deleteId?: number;
}) {
  const router = useRouter();
  const [l, setL] = useState<Listing>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  function set<K extends keyof Listing>(k: K, v: Listing[K]) {
    setL((prev) => ({ ...prev, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSubmit({
        title: l.title,
        description: l.description,
        role_type: l.role_type,
        requirements: l.requirements,
        deadline: l.deadline || null,
        status: l.status,
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
    if (!deleteId) return;
    if (
      !confirm(
        "공고를 삭제하면 이 공고로 들어온 지원서들은 공고 정보를 잃습니다. 정말 삭제할까요?",
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/audition-listings/${deleteId}`, {
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
      <Row label="공고 제목 *">
        <input
          required
          value={l.title}
          onChange={(e) => set("title", e.target.value)}
          className="field"
          placeholder="2026 봄 시리즈 — 여주연 모집"
        />
      </Row>
      <div className="grid sm:grid-cols-2 gap-3">
        <Row label="역할 타입">
          <select
            value={l.role_type}
            onChange={(e) => set("role_type", e.target.value as Listing["role_type"])}
            className="field"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </Row>
        <Row label="상태">
          <select
            value={l.status}
            onChange={(e) => set("status", e.target.value as Listing["status"])}
            className="field"
          >
            <option value="draft">초안 (공개 X)</option>
            <option value="open">모집중 (공개)</option>
            <option value="closed">마감 (공개 X)</option>
          </select>
        </Row>
      </div>
      <Row label="설명">
        <textarea
          value={l.description}
          onChange={(e) => set("description", e.target.value)}
          rows={4}
          className="field"
          placeholder="작품 개요, 캐릭터 소개, 촬영 기간 등"
        />
      </Row>
      <Row label="지원 조건">
        <textarea
          value={l.requirements}
          onChange={(e) => set("requirements", e.target.value)}
          rows={3}
          className="field"
          placeholder="20~30대 여성 / 액션 가능자 우대 / 서울 거주"
        />
      </Row>
      <Row label="마감일">
        <input
          type="date"
          value={l.deadline ?? ""}
          onChange={(e) => set("deadline", e.target.value || null)}
          className="field max-w-xs"
        />
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
