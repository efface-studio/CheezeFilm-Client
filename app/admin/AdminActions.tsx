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

type StatusVal = "pending" | "reviewing" | "accepted" | "rejected";

const STATUS_OPTIONS: {
  value: StatusVal;
  label: string;
  /** Active fill — solid Toss-style color, white text. */
  activeBg: string;
  activeText: string;
  /** Inactive — soft pastel pill that hints at the destination color. */
  idle: string;
}[] = [
  {
    value: "pending",
    label: "대기",
    activeBg: "bg-zinc-900",
    activeText: "text-white",
    idle: "bg-zinc-100 text-zinc-700 hover:bg-zinc-200",
  },
  {
    value: "reviewing",
    label: "검토중",
    activeBg: "bg-amber-500",
    activeText: "text-white",
    idle: "bg-amber-50 text-amber-700 hover:bg-amber-100",
  },
  {
    value: "accepted",
    label: "합격",
    activeBg: "bg-emerald-500",
    activeText: "text-white",
    idle: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  },
  {
    value: "rejected",
    label: "불합격",
    activeBg: "bg-rose-500",
    activeText: "text-white",
    idle: "bg-rose-50 text-rose-700 hover:bg-rose-100",
  },
];

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
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold text-zinc-500 mr-1">상태</span>
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_OPTIONS.map((opt) => {
            const active = props.currentStatus === opt.value;
            return (
              <button
                key={opt.value}
                disabled={busy || active}
                onClick={() => setStatus(opt.value)}
                aria-pressed={active}
                className={`text-sm font-bold px-4 py-2 rounded-xl transition-all active:scale-[0.97] disabled:cursor-default ${
                  active
                    ? `${opt.activeBg} ${opt.activeText} shadow-sm`
                    : opt.idle + " disabled:opacity-60"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <button
          onClick={remove}
          disabled={busy}
          className="ml-auto text-sm font-bold px-4 py-2 rounded-xl text-zinc-500 hover:bg-rose-50 hover:text-rose-700 transition-colors disabled:opacity-50"
        >
          삭제
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={toggleRead}
        disabled={busy}
        className={`text-sm font-bold px-4 py-2 rounded-xl transition-all active:scale-[0.97] ${
          props.currentIsRead
            ? "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
            : "bg-purple-600 text-white hover:bg-purple-700 shadow-sm"
        }`}
      >
        {props.currentIsRead ? "↺ 안 읽음으로" : "✓ 확인 처리"}
      </button>
      <button
        onClick={remove}
        disabled={busy}
        className="ml-auto text-sm font-bold px-4 py-2 rounded-xl text-zinc-500 hover:bg-rose-50 hover:text-rose-700 transition-colors disabled:opacity-50"
      >
        삭제
      </button>
    </div>
  );
}
