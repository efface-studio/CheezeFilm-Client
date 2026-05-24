"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import DatePicker from "@/components/DatePicker";
import { formatDeadline } from "@/lib/deadline";

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

const ROLE_OPTIONS: { value: Listing["role_type"]; label: string; icon: string; hint: string }[] = [
  { value: "lead", label: "주연", icon: "★", hint: "메인 캐릭터" },
  { value: "support", label: "조연", icon: "◆", hint: "서브 캐릭터" },
  { value: "extra", label: "단역", icon: "▪", hint: "엑스트라" },
  { value: "staff", label: "스태프", icon: "✎", hint: "촬영/편집/연출" },
];

type StatusOpt = {
  value: Listing["status"];
  label: string;
  hint: string;
  badge: string; // tailwind classes for the row badge
  pill: string;  // tailwind classes for the active pill in the form
  dot: string;
};

const STATUS_OPTIONS: StatusOpt[] = [
  {
    value: "draft",
    label: "초안",
    hint: "공개 X · 보관용",
    badge: "bg-zinc-100 text-zinc-700",
    pill: "bg-zinc-900 text-white border-zinc-900",
    dot: "bg-zinc-400",
  },
  {
    value: "open",
    label: "모집중",
    hint: "공개 · 지원 접수",
    badge: "bg-emerald-100 text-emerald-800",
    pill: "bg-emerald-600 text-white border-emerald-600",
    dot: "bg-emerald-500",
  },
  {
    value: "closed",
    label: "마감",
    hint: "공개 X · 종료",
    badge: "bg-rose-100 text-rose-800",
    pill: "bg-rose-600 text-white border-rose-600",
    dot: "bg-rose-500",
  },
];

const STATUS_MAP: Record<Listing["status"], StatusOpt> = STATUS_OPTIONS.reduce(
  (acc, s) => ({ ...acc, [s.value]: s }),
  {} as Record<Listing["status"], StatusOpt>,
);

const ROLE_MAP: Record<Listing["role_type"], typeof ROLE_OPTIONS[number]> =
  ROLE_OPTIONS.reduce(
    (acc, r) => ({ ...acc, [r.value]: r }),
    {} as Record<Listing["role_type"], typeof ROLE_OPTIONS[number]>,
  );

export default function ListingsCrud({ listings }: { listings: Listing[] }) {
  const [editing, setEditing] = useState<number | "new" | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="text-sm font-bold px-4 py-2 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 active:scale-[0.98] transition-all inline-flex items-center gap-1.5"
        >
          <span className="text-base leading-none">+</span> 새 공고
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
            <div key={l.id} className="bg-zinc-50/60">
              <ListingEditor
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
  const status = STATUS_MAP[listing.status];
  return (
    <div className="p-4 flex items-center justify-between gap-4 hover:bg-zinc-50">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
          {listing.title}
          <span
            className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded inline-flex items-center gap-1 ${status.badge}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
        </div>
        <div className="text-xs text-zinc-500 truncate mt-0.5">
          {ROLE_MAP[listing.role_type].label} ·{" "}
          {listing.deadline ? `마감 ${formatDeadline(listing.deadline)}` : "마감일 미정"} ·{" "}
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
      className="fixed inset-0 z-50 grid place-items-center bg-zinc-900/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-white rounded-xl shadow-2xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="font-bold text-lg leading-tight">새 공고 추가</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 grid place-items-center"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
        <ListingEditor
          initial={emptyListing()}
          submitLabel="공고 추가"
          onSubmit={async (data) => {
            const res = await fetch("/api/admin/audition-listings", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data),
            });
            if (!res.ok) {
              const d = (await res.json().catch(() => ({}))) as { error?: string };
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

const TITLE_MAX = 80;
const DESC_MAX = 1000;
const REQ_MAX = 400;

function ListingEditor({
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

  const status = STATUS_MAP[l.status];

  return (
    <form onSubmit={submit} className="grid lg:grid-cols-[1fr_320px]">
      {/* ── Left: form ── */}
      <div className="p-6 lg:p-7 space-y-7 min-w-0">
        {/* Section: 기본 */}
        <Section title="기본 정보">
          <div>
            <Label>공고 제목</Label>
            <input
              required
              value={l.title}
              maxLength={TITLE_MAX}
              onChange={(e) => set("title", e.target.value)}
              className="field-lg"
              placeholder="2026 봄 시리즈 — 여주연 모집"
            />
            <Counter current={l.title.length} max={TITLE_MAX} />
          </div>

          <div>
            <Label>역할 타입</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ROLE_OPTIONS.map((r) => {
                const active = l.role_type === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => set("role_type", r.value)}
                    className={`text-left p-3 rounded-lg border-2 transition-all ${
                      active
                        ? "border-purple-600 bg-purple-50 shadow-sm"
                        : "border-zinc-200 hover:border-zinc-400 bg-white"
                    }`}
                  >
                    <div className={`text-base ${active ? "text-purple-700" : "text-zinc-400"}`}>
                      {r.icon}
                    </div>
                    <div className={`text-sm font-bold mt-1 ${active ? "text-zinc-900" : "text-zinc-700"}`}>
                      {r.label}
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">{r.hint}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label>상태</Label>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_OPTIONS.map((s) => {
                const active = l.status === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => set("status", s.value)}
                    className={`p-3 rounded-lg border-2 transition-all text-left ${
                      active
                        ? `${s.pill} shadow-sm`
                        : "border-zinc-200 hover:border-zinc-400 bg-white text-zinc-700"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-white/90" : s.dot}`} />
                      <span className="text-sm font-bold">{s.label}</span>
                    </div>
                    <div className={`text-[10px] mt-1 ${active ? "text-white/80" : "text-zinc-500"}`}>
                      {s.hint}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </Section>

        {/* Section: 콘텐츠 */}
        <Section title="상세 내용">
          <div>
            <Label>설명</Label>
            <textarea
              value={l.description}
              maxLength={DESC_MAX}
              onChange={(e) => set("description", e.target.value)}
              rows={5}
              className="field"
              placeholder="작품 개요, 캐릭터 소개, 촬영 기간 등"
            />
            <Counter current={l.description.length} max={DESC_MAX} />
          </div>
          <div>
            <Label>지원 조건</Label>
            <textarea
              value={l.requirements}
              maxLength={REQ_MAX}
              onChange={(e) => set("requirements", e.target.value)}
              rows={3}
              className="field"
              placeholder="20~30대 여성 / 액션 가능자 우대 / 서울 거주"
            />
            <Counter current={l.requirements.length} max={REQ_MAX} />
          </div>
        </Section>

        {/* Section: 일정 */}
        <Section title="일정">
          <div>
            <Label>마감일</Label>
            <DatePicker
              value={l.deadline}
              onChange={(v) => set("deadline", v)}
              className="max-w-sm"
              withTime
            />
            <p className="text-[11px] text-zinc-500 mt-1.5">
              비워두면 마감 없는 상시 공고로 표시됩니다. 마감일이 지나면
              상태가 '모집중'이어도 자동으로 비공개 처리돼요.
            </p>
          </div>
        </Section>

        {error && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2.5 text-rose-700 text-sm flex items-start gap-2">
            <span aria-hidden>⚠</span>
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* ── Right: preview & actions ── */}
      <aside className="bg-zinc-50 border-l border-zinc-200 p-6 lg:p-7 lg:sticky lg:top-[72px] lg:self-start">
        <h4 className="text-[13px] font-bold text-zinc-900 mb-1">
          공개 사이트 미리보기
        </h4>
        <p className="text-xs text-zinc-500 mb-4">
          지원자에게 이렇게 보입니다.
        </p>

        <PreviewCard listing={l} />

        <div className="mt-5 p-3 rounded-lg bg-white border border-zinc-200 text-[11px] text-zinc-600 leading-relaxed space-y-2">
          <div className="flex items-start gap-2">
            <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${status.dot}`} />
            <div>
              <span className="font-semibold text-zinc-900">{status.label}</span>{" "}
              <span className="text-zinc-500">— {status.hint}</span>
            </div>
          </div>
          {l.deadline && (
            <div className="text-zinc-600">
              마감{" "}
              <span className="font-semibold text-zinc-900 tabular-nums">
                {formatDeadline(l.deadline)}
              </span>
            </div>
          )}
        </div>

        {/* Sticky footer actions */}
        <div className="mt-6 pt-5 border-t border-zinc-200 flex items-center justify-between gap-2">
          {allowDelete ? (
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="text-xs font-semibold px-3 py-2 rounded border border-rose-300 text-rose-700 hover:bg-rose-50 disabled:opacity-50"
            >
              삭제
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="text-xs font-bold px-3 py-2 rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={busy || !l.title.trim()}
              className="text-xs font-bold px-4 py-2 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 active:scale-[0.98] transition-all disabled:bg-zinc-300 disabled:cursor-not-allowed"
            >
              {busy ? "저장 중…" : submitLabel}
            </button>
          </div>
        </div>
      </aside>

      <style jsx>{`
        :global(.field) {
          width: 100%;
          border: 1px solid rgb(212 212 216);
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
        :global(.field-lg) {
          width: 100%;
          border: none;
          border-bottom: 2px solid rgb(228 228 231);
          border-radius: 0;
          padding: 6px 0;
          font-size: 20px;
          font-weight: 700;
          background: transparent;
          transition: border-color 0.15s;
        }
        :global(.field-lg::placeholder) {
          color: rgb(212 212 216);
          font-weight: 500;
        }
        :global(.field-lg:focus) {
          outline: none;
          border-bottom-color: rgb(147 51 234);
        }
      `}</style>
    </form>
  );
}

// ── small UI atoms ────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  /** Optional — only kept for callers; not displayed as an eyebrow. */
  eyebrow?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h4 className="text-[15px] font-bold text-zinc-900 pb-2 border-b border-zinc-200">
        {title}
      </h4>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] tracking-wider uppercase font-semibold text-zinc-600 mb-1.5">
      {children}
    </div>
  );
}

function Counter({ current, max }: { current: number; max: number }) {
  const near = current > max * 0.85;
  return (
    <div
      className={`text-[10px] tabular-nums mt-1 text-right ${
        near ? "text-amber-700 font-semibold" : "text-zinc-400"
      }`}
    >
      {current} / {max}
    </div>
  );
}

/**
 * Mini rendition of how the listing will appear on the public /support
 * page. Mirrors the V1 listing card vocabulary closely enough to set
 * accurate expectations, but compressed to fit in the side rail.
 */
function PreviewCard({ listing }: { listing: Listing }) {
  const role = ROLE_MAP[listing.role_type];
  const status = STATUS_MAP[listing.status];
  return (
    <div className="border-2 border-purple-900 bg-amber-50/60 p-4 rounded-sm shadow-[3px_3px_0_rgba(82,34,163,0.15)]">
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 bg-purple-900 text-amber-300 font-bold">
          {role.label}
        </span>
        <span
          className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded inline-flex items-center gap-1 ${status.badge}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
        {listing.deadline && (
          <span className="text-[10px] uppercase tracking-widest text-rose-800">
            ~ {formatDeadline(listing.deadline)}
          </span>
        )}
      </div>
      <h5 className="font-bold text-zinc-900 leading-snug">
        {listing.title || (
          <span className="text-zinc-400 font-medium italic">
            공고 제목을 입력하세요
          </span>
        )}
      </h5>
      {listing.description && (
        <p className="text-xs text-zinc-600 whitespace-pre-wrap mt-2 line-clamp-4">
          {listing.description}
        </p>
      )}
      {listing.requirements && (
        <div className="mt-3 pt-3 border-t border-purple-900/15">
          <div className="text-[9px] uppercase tracking-widest text-purple-900 mb-1 font-bold">
            지원 조건
          </div>
          <p className="text-[11px] text-zinc-600 whitespace-pre-wrap line-clamp-3">
            {listing.requirements}
          </p>
        </div>
      )}
    </div>
  );
}
