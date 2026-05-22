"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ContentEntry } from "@/lib/content";

type Item = ContentEntry & { value: string };

export default function ContentEditor({ items }: { items: Item[] }) {
  const grouped = items.reduce<Record<string, Item[]>>((acc, it) => {
    (acc[it.section] ||= []).push(it);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div className="rounded border border-zinc-200 bg-white p-4 text-sm text-zinc-600 leading-relaxed">
        <strong className="text-zinc-900">사이트의 모든 텍스트</strong>를 여기서
        바꿀 수 있어요. 저장 즉시 메인 사이트에 반영됩니다. 초기값으로 되돌리려면
        ↺ 버튼을 누르세요.
      </div>
      {Object.entries(grouped).map(([section, entries]) => (
        <section key={section}>
          <h3 className="text-xs uppercase tracking-[0.2em] text-zinc-500 mb-3 font-semibold">
            {section}
          </h3>
          <div className="rounded-lg border border-zinc-200 bg-white divide-y divide-zinc-100">
            {entries.map((it) => (
              <ContentRow key={it.key} item={it} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ContentRow({ item }: { item: Item }) {
  const router = useRouter();
  const [value, setValue] = useState(item.value);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const dirty = value !== item.value;
  const isDefault = item.value === item.fallback;

  async function save() {
    setError("");
    try {
      const res = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: item.key, value }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "저장 실패");
      }
      setSavedAt(new Date().toLocaleTimeString("ko-KR"));
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    }
  }

  async function reset() {
    if (!confirm(`"${item.label}" 값을 초기값으로 되돌릴까요?`)) return;
    setError("");
    try {
      const res = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: item.key, reset: true }),
      });
      if (!res.ok) throw new Error("초기화 실패");
      setValue(item.fallback);
      setSavedAt(new Date().toLocaleTimeString("ko-KR"));
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    }
  }

  return (
    <div className="p-4 grid sm:grid-cols-[200px_1fr_auto] gap-3 sm:gap-5 items-start">
      <div className="text-sm">
        <div className="font-semibold text-zinc-900">{item.label}</div>
        <div className="mt-1 text-[11px] font-mono text-zinc-400 break-all">
          {item.key}
        </div>
        {!isDefault && (
          <span className="mt-2 inline-block text-[10px] uppercase tracking-wider bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
            수정됨
          </span>
        )}
      </div>
      <div>
        {item.type === "longtext" ? (
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={Math.min(8, Math.max(2, value.split("\n").length + 1))}
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        ) : (
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        )}
        {error && <div className="mt-1 text-xs text-red-600">⚠ {error}</div>}
        {savedAt && !dirty && !error && (
          <div className="mt-1 text-xs text-emerald-600">
            ✓ 저장됨 {savedAt}
          </div>
        )}
      </div>
      <div className="flex flex-row sm:flex-col gap-2">
        <button
          type="button"
          onClick={save}
          disabled={!dirty || pending}
          className="px-3 py-1.5 text-xs font-semibold rounded bg-purple-600 text-white hover:bg-purple-700 disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed"
        >
          {pending ? "저장중..." : "저장"}
        </button>
        {!isDefault && (
          <button
            type="button"
            onClick={reset}
            className="px-3 py-1.5 text-xs font-semibold rounded border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
            title="초기값으로 되돌리기"
          >
            ↺
          </button>
        )}
      </div>
    </div>
  );
}
