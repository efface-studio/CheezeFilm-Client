"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props =
  | {
      type: "audition";
      id: number;
      currentStatus: "pending" | "reviewing" | "accepted" | "rejected";
    }
  | {
      type: "fan";
      id: number;
      currentIsRead: boolean;
    };

const STATUS_OPTIONS = [
  { value: "pending", label: "대기" },
  { value: "reviewing", label: "검토중" },
  { value: "accepted", label: "합격" },
  { value: "rejected", label: "불합격" },
] as const;

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border-zinc-300",
  reviewing: "bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-300",
  accepted: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-300",
  rejected: "bg-rose-100 text-rose-800 hover:bg-rose-200 border-rose-300",
};

export default function AdminActions(props: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function setStatus(status: string) {
    if (props.type !== "audition") return;
    setBusy(true);
    await fetch(`/api/admin/auditions/${props.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
    setBusy(false);
  }

  async function toggleRead() {
    if (props.type !== "fan") return;
    setBusy(true);
    await fetch(`/api/admin/fan-messages/${props.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_read: !props.currentIsRead }),
    });
    router.refresh();
    setBusy(false);
  }

  async function remove() {
    const ok = confirm("정말 삭제할까요? 복구할 수 없습니다.");
    if (!ok) return;
    setBusy(true);
    const url =
      props.type === "audition"
        ? `/api/admin/auditions/${props.id}`
        : `/api/admin/fan-messages/${props.id}`;
    await fetch(url, { method: "DELETE" });
    router.refresh();
    setBusy(false);
  }

  if (props.type === "audition") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-zinc-500 mr-1">상태:</span>
        {STATUS_OPTIONS.map((opt) => {
          const active = props.currentStatus === opt.value;
          return (
            <button
              key={opt.value}
              disabled={busy || active}
              onClick={() => setStatus(opt.value)}
              className={`text-xs font-semibold px-2.5 py-1 rounded border transition-colors ${
                active
                  ? "bg-purple-600 text-white border-purple-700 cursor-default"
                  : `${STATUS_COLORS[opt.value]} cursor-pointer`
              } disabled:opacity-60`}
            >
              {opt.label}
            </button>
          );
        })}
        <button
          onClick={remove}
          disabled={busy}
          className="ml-auto text-xs font-semibold px-2.5 py-1 rounded border border-zinc-300 text-zinc-600 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700"
        >
          삭제
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggleRead}
        disabled={busy}
        className="text-xs font-semibold px-2.5 py-1 rounded border border-zinc-300 hover:bg-zinc-50 disabled:opacity-60"
      >
        {props.currentIsRead ? "↺ 안 읽음으로" : "✓ 확인 처리"}
      </button>
      <button
        onClick={remove}
        disabled={busy}
        className="ml-auto text-xs font-semibold px-2.5 py-1 rounded border border-zinc-300 text-zinc-600 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700"
      >
        삭제
      </button>
    </div>
  );
}
